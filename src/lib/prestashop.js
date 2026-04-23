import axios from 'axios';

/**
 * PrestaShop API Client for Next.js Server Components
 */
export class PrestaShopClient {
  constructor(apiUrl = '', apiKey = '') {
    // En modo estático, intentamos leer de localStorage si no se pasan parámetros
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('ps_url');
      const savedKey = localStorage.getItem('ps_key');
      this.apiUrl = apiUrl || savedUrl || '';
      this.apiKey = apiKey || savedKey || '';
    } else {
      this.apiUrl = apiUrl;
      this.apiKey = apiKey;
    }

    const cleanUrl = (this.apiUrl || '').replace(/\/$/, '');
    this.baseUrl = cleanUrl.endsWith('/api') ? cleanUrl : cleanUrl + '/api';
    this.apiKey = (this.apiKey || '').trim();
    this.isBrowser = typeof window !== 'undefined';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: { username: this.apiKey, password: '' },
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      params: { output_format: 'JSON', ws_key: this.apiKey },
      timeout: 60000, 
    });

    // Interceptor mágico para CORS total
    this.client.interceptors.request.use((config) => {
      if (this.isBrowser) {
        // En App Hosting usamos siempre nuestro propio proxy interno /api/ps-proxy
        // Esto elimina para siempre los problemas de CORS y bloqueos 403
        const endpoint = config.url;
        const params = config.params || {};
        config.url = '/api/ps-proxy';
        config.method = 'post';
        config.data = { endpoint, params, apiUrl: this.apiUrl, apiKey: this.apiKey };
        config.params = {};
        config.baseURL = ''; 
      }
      return config;
    });
  }

  getText(field) {
    if (!field) return '';
    if (typeof field === 'string') return field.trim();
    if (typeof field === 'object') {
        const val = field.value || field._ || field['#text'] || '';
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'object') return this.getText(val);
    }
    return String(field).trim();
  }

  /**
   * Fetch customers with pagination and optional filters
   */
  async getCustomers(page = 1, pageSize = 50, display = 'full', filterB2B = false, startDate = null, endDate = null) {
    try {
      let targetCustomerIds = [];
      let totalCount = 0;
      
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter['filter[date_add]'] = `[${startDate},${endDate}]`;
      } else if (startDate) {
        dateFilter['filter[date_add]'] = `>[${startDate}]`;
      } else if (endDate) {
        dateFilter['filter[date_add]'] = `<[${endDate}]`;
      }

      // Perform a comprehensive discovery if B2B filter or a Date Filter is enabled
      if (filterB2B || Object.keys(dateFilter).length > 0) {
        let b2bIdsSet = new Set();
        
        if (filterB2B) {
          // Robust B2B Discovery: We fetch ID and B2B-identifying fields
          // and filter in JS to avoid unreliable PrestaShop API filter behaviors.
          const [addrRes, custRes] = await Promise.all([
            this.client.get('/addresses', {
              params: { display: '[id_customer,company,vat_number]', output_format: 'JSON', limit: '0,20000' }
            }).catch(() => ({ data: {} })),
            this.client.get('/customers', {
              params: { display: '[id,company,siret]', output_format: 'JSON', limit: '0,20000' }
            }).catch(() => ({ data: {} }))
          ]);

          const aList = Array.isArray(addrRes.data?.addresses) ? addrRes.data.addresses : (addrRes.data?.addresses ? [addrRes.data.addresses] : []);
          const cList = Array.isArray(custRes.data?.customers) ? custRes.data.customers : (custRes.data?.customers ? [custRes.data.customers] : []);

          aList.forEach(a => {
            if (this.getText(a.company) || this.getText(a.vat_number)) {
              const id = this.getText(a.id_customer);
              if (id && id !== '0') b2bIdsSet.add(id);
            }
          });
          
          cList.forEach(c => {
            if (this.getText(c.company) || this.getText(c.siret)) {
              const id = this.getText(c.id);
              if (id && id !== '0') b2bIdsSet.add(id);
            }
          });
        }

        // Apply Date Filter if specified - We now filter by ORDER activity
        // If a month is selected, we want to see customers who BOUGHT in that period
        let dateMatchedIds = null;
        if (Object.keys(dateFilter).length > 0) {
            // Find orders in that date range
            const orderDateRes = await this.client.get('/orders', {
                params: { display: '[id_customer]', output_format: 'JSON', limit: '0,10000', ...dateFilter }
            }).catch(() => ({ data: {} }));
            const odList = Array.isArray(orderDateRes.data?.orders) ? orderDateRes.data.orders : (orderDateRes.data?.orders ? [orderDateRes.data.orders] : []);
            
            // Also find customers registered in that range (optional but good for completeness)
            const custDateRes = await this.client.get('/customers', {
                params: { display: '[id]', output_format: 'JSON', limit: '0,5000', ...dateFilter }
            }).catch(() => ({ data: {} }));
            const cdList = Array.isArray(custDateRes.data?.customers) ? custDateRes.data.customers : (custDateRes.data?.customers ? [custDateRes.data.customers] : []);
            
            dateMatchedIds = new Set([
                ...odList.map(o => this.getText(o.id_customer)),
                ...cdList.map(c => this.getText(c.id))
            ].filter(id => id && id !== '0'));
        }

        // Intersect B2B and Date filters
        let finalIds = [];
        if (filterB2B && dateMatchedIds) {
            finalIds = Array.from(b2bIdsSet).filter(id => dateMatchedIds.has(id));
        } else if (filterB2B) {
            finalIds = Array.from(b2bIdsSet);
        } else if (dateMatchedIds) {
            finalIds = Array.from(dateMatchedIds);
        }

        // Sort IDs DESC to show newest first
        const sortedIds = finalIds.map(Number).sort((a, b) => b - a).map(String);
        
        totalCount = sortedIds.length;
        const start = (page - 1) * pageSize;
        targetCustomerIds = sortedIds.slice(start, start + pageSize);

        if (targetCustomerIds.length === 0) {
            return { customers: [], page, pageSize, totalB2B: filterB2B ? totalCount : null, hasMore: false };
        }
      }

      const params = { 
        display, 
        'output_format': 'JSON',
        'sort': 'id_DESC'
      };

      if (targetCustomerIds.length > 0) {
        params['filter[id]'] = `[${targetCustomerIds.join('|')}]`;
      } else if (filterB2B || Object.keys(dateFilter).length > 0) {
        // Safe guard in case there was matching count but empty target?
        // Actually earlier return covers 0 targets. 
      } else {
        const offset = (page - 1) * pageSize;
        params['limit'] = `${offset},${pageSize}`;
      }

      const response = await this.client.get('/customers', { params });
      
      let rawData = response.data;
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch(e) { return { customers: [], page, pageSize, hasMore: false }; }
      }

      const customers = rawData.customers || [];
      const customerList = Array.isArray(customers) ? customers : (customers ? [customers] : []);
      
      if (customerList.length === 0) return { customers: [], page, pageSize, hasMore: false };

      const chunkArray = (arr, size) => {
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
          return chunks;
      };

      const idChunks = chunkArray(customerList.map(c => c.id), 50); 
      
      const addrPromises = idChunks.map(chunk => 
        this.client.get('/addresses', { 
            params: { 'filter[id_customer]': `[${chunk.join('|')}]`, display: 'full', output_format: 'JSON', limit: '0,500' } 
        }).catch(() => ({ data: { addresses: [] } }))
      );

      const orderPromises = idChunks.map(chunk => 
        this.client.get('/orders', { 
            params: { 
                'filter[id_customer]': `[${chunk.join('|')}]`, 
                display: 'full', 
                output_format: 'JSON', 
                'sort': 'id_DESC',
                'limit': '0,1000', // High limit for current page members
                ...dateFilter // Apply date filter directly to the order query for precision
            } 
        }).catch(() => ({ data: { orders: [] } }))
      );

      const [addrResponses, orderResponses] = await Promise.all([
        Promise.all(addrPromises),
        Promise.all(orderPromises)
      ]);
      
      const addressList = addrResponses.flatMap(res => {
          const addrs = res.data.addresses || [];
          return Array.isArray(addrs) ? addrs : (addrs ? [addrs] : []);
      });

      const orderList = orderResponses.flatMap(res => {
          const ords = res.data.orders || [];
          return Array.isArray(ords) ? ords : (ords ? [ords] : []);
      });
      
      const finalCustomers = customerList.map(c => {
        const customerAddresses = addressList.filter(a => String(a.id_customer) === String(c.id));
        const bestAddr = customerAddresses.find(a => this.getText(a.vat_number)) || 
                         customerAddresses.find(a => this.getText(a.company)) || 
                         customerAddresses[0];

        // All orders for this customer (up to limit)
        let customerOrders = orderList.filter(o => String(o.id_customer) === String(c.id));
        
        // If a date range is active, we should calculate totals based on that range
        // so the "Total Gastado" in the list matches the selected period.
        if (startDate || endDate) {
          const sDate = startDate ? new Date(startDate) : null;
          const eDate = endDate ? new Date(endDate) : null;
          
          customerOrders = customerOrders.filter(o => {
            const oDate = new Date(o.date_add);
            if (sDate && oDate < sDate) return false;
            if (eDate && oDate > eDate) return false;
            return true;
          });
        }

        const sortedOrders = [...customerOrders].sort((a, b) => new Date(b.date_add) - new Date(a.date_add));
        const totalSpent = sortedOrders.reduce((acc, o) => acc + parseFloat(o.total_paid || 0), 0);

        return {
          ...this.normalizeCustomer(c, bestAddr),
          last_purchase: sortedOrders.length > 0 ? sortedOrders[0].date_add : null,
          order_count: sortedOrders.length,
          total_spent: totalSpent,
          recent_orders: sortedOrders.slice(0, 3)
        };
      });

      return {
        customers: finalCustomers,
        page,
        pageSize,
        hasMore: filterB2B ? (totalCount > page * pageSize) : (customerList.length === pageSize),
        totalB2B: filterB2B ? totalCount : null
      };
    } catch (error) {
      console.error('PrestaShop Client Error:', error.message);
      return { customers: [], page, pageSize, hasMore: false };
    }
  }

  async getTotalCustomers() {
    try {
      const response = await this.client.get('/customers', {
        params: { display: '[id]', output_format: 'JSON' }
      });
      const customers = response.data.customers || [];
      return Array.isArray(customers) ? customers.length : 1;
    } catch (error) {
       return 0;
    }
  }

  async scanB2B() {
    try {
      // 1. Discover all B2B IDs in chunks (DEEP SCAN)
      let b2bIdsSet = new Set();
      let offset = 0;
      const discoveryChunk = 10000;
      let hasMore = true;

      while (hasMore) {
        const [addrRes, custRes] = await Promise.all([
          this.client.get('/addresses', {
            params: { display: '[id_customer,company,vat_number]', output_format: 'JSON', limit: `${offset},${discoveryChunk}` }
          }).catch(() => ({ data: {} })),
          this.client.get('/customers', {
            params: { display: '[id,company,siret]', output_format: 'JSON', limit: `${offset},${discoveryChunk}` }
          }).catch(() => ({ data: {} }))
        ]);

        const aList = Array.isArray(addrRes.data?.addresses) ? addrRes.data.addresses : (addrRes.data?.addresses ? [addrRes.data.addresses] : []);
        const cList = Array.isArray(custRes.data?.customers) ? custRes.data.customers : (custRes.data?.customers ? [custRes.data.customers] : []);

        if (aList.length === 0 && cList.length === 0) {
          hasMore = false;
        } else {
          aList.forEach(a => {
            if (this.getText(a.company) || this.getText(a.vat_number)) {
              const id = this.getText(a.id_customer);
              if (id && id !== '0') b2bIdsSet.add(id);
            }
          });
          cList.forEach(c => {
            if (this.getText(c.company) || this.getText(c.siret)) {
              const id = this.getText(c.id);
              if (id && id !== '0') b2bIdsSet.add(id);
            }
          });
          
          offset += discoveryChunk;
          // Security cap at 100,000 to avoid infinite loops
          if (offset > 100000) hasMore = false;
          
          // Pequeña pausa para no saturar al proxy ni al servidor
          await new Promise(r => setTimeout(r, 300));
        }
      }

      const b2bIds = Array.from(b2bIdsSet);
      if (b2bIds.length === 0) return { customers: [] };

      // 2. Fetch full data for these IDs in larger chunks
      const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
        return chunks;
      };

      const idChunks = chunkArray(b2bIds, 150);
      let allCustomers = [];

      for (const chunk of idChunks) {
        const response = await this.client.get('/customers', {
          params: { display: 'full', output_format: 'JSON', 'filter[id]': `[${chunk.join('|')}]` }
        });
        
        const rawData = response.data;
        const customers = rawData.customers ? (Array.isArray(rawData.customers) ? rawData.customers : [rawData.customers]) : [];
        
        // Fetch addresses and orders for these specific customers
        const [addrChunkRes, orderChunkRes] = await Promise.all([
          this.client.get('/addresses', {
            params: { display: 'full', output_format: 'JSON', 'filter[id_customer]': `[${chunk.join('|')}]`, limit: '0,1000' }
          }).catch(() => ({ data: { addresses: [] } })),
          this.client.get('/orders', {
            params: { display: 'full', output_format: 'JSON', 'filter[id_customer]': `[${chunk.join('|')}]`, limit: '0,5000', sort: 'id_DESC' }
          }).catch(() => ({ data: { orders: [] } }))
        ]);

        const addrList = Array.isArray(addrChunkRes.data?.addresses) ? addrChunkRes.data.addresses : (addrChunkRes.data?.addresses ? [addrChunkRes.data.addresses] : []);
        const orderList = Array.isArray(orderChunkRes.data?.orders) ? orderChunkRes.data.orders : (orderChunkRes.data?.orders ? [orderChunkRes.data.orders] : []);

        const normalizedBatch = customers.map(c => {
          const customerAddresses = addrList.filter(a => String(a.id_customer) === String(c.id));
          const bestAddr = customerAddresses.find(a => this.getText(a.vat_number)) || customerAddresses.find(a => this.getText(a.company)) || customerAddresses[0];
          const customerOrders = orderList.filter(o => String(o.id_customer) === String(c.id));
          const totalSpent = customerOrders.reduce((acc, o) => acc + parseFloat(o.total_paid || 0), 0);

          return {
            ...this.normalizeCustomer(c, bestAddr),
            last_purchase: customerOrders.length > 0 ? customerOrders[0].date_add : null,
            order_count: customerOrders.length,
            total_spent: totalSpent,
            orders: customerOrders.map(o => ({
              id: o.id,
              reference: o.reference,
              date_add: o.date_add,
              total_paid: o.total_paid,
              payment: o.payment,
              items: o.associations?.order_rows || []
            }))
          };
        });

        allCustomers = [...allCustomers, ...normalizedBatch];
      }

      return { customers: allCustomers, total: allCustomers.length };
    } catch (error) {
      console.error('Scan Error:', error);
      throw error;
    }
  }

  async getCustomerDetails(id) {
    try {
      const customerRes = await this.client.get(`/customers/${id}`, { 
          params: { output_format: 'JSON' } 
      });
      const ordersRes = await this.client.get('/orders', {
        params: { 
            'filter[id_customer]': `[${id}]`, 
            display: 'full', 
            output_format: 'JSON' 
        },
      });

      const customer = customerRes.data.customer;
      const orders = ordersRes.data.orders || [];
      const orderList = Array.isArray(orders) ? orders : (orders ? [orders] : []);
      
      const sortedOrders = orderList.sort((a, b) => new Date(b.date_add) - new Date(a.date_add));
      const totalSpent = sortedOrders.reduce((acc, o) => acc + parseFloat(o.total_paid || 0), 0);

      return {
        customer: {
          ...this.normalizeCustomer(customer),
          total_spent: totalSpent,
          order_count: sortedOrders.length
        },
        orders: sortedOrders,
      };
    } catch (error) {
       return null;
    }
  }

  async getOrders(limit = '0,10', display = 'full') {
    try {
      const response = await this.client.get('/orders', {
        params: { limit, display, sort: 'id_DESC', output_format: 'JSON' },
      });
      const orders = response.data.orders || [];
      return Array.isArray(orders) ? orders : [orders];
    } catch (error) {
      return [];
    }
  }

  async getAddresses(limit = '0,100') {
    try {
      const response = await this.client.get('/addresses', { 
         params: { display: 'full', limit, output_format: 'JSON' } 
      });
      const addresses = response.data.addresses || [];
      return Array.isArray(addresses) ? addresses : [addresses];
    } catch (error) {
      return [];
    }
  }

  async getDashboardStats() {
    try {
      const [customersRes, ordersRes] = await Promise.all([
        this.client.get('/customers', { params: { limit: '0,1', output_format: 'JSON' } }),
        this.client.get('/orders', { params: { limit: '0,1', output_format: 'JSON' } })
      ]);

      return {
        totalCustomers: 'Connected',
        b2bPercentage: 'Analyzing',
        monthlyOrders: ordersRes.data.orders ? (Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders.length : 1) : 0,
        newB2B: 'Active'
      };
    } catch (error) {
      return null;
    }
  }

  normalizeCustomer(c, address = null) {
    if (!c) return {};
    const customerCompany = this.getText(c.company);
    const addressCompany = address ? this.getText(address.company) : '';
    const rawCompany = customerCompany || addressCompany || '';
    
    const siret = this.getText(c.siret);
    const vat = (address ? this.getText(address.vat_number) : '') || siret;
    
    const hasCompany = rawCompany !== '';
    const hasVat = vat !== '';
    const hasSiret = siret !== '';

    return {
      id: c.id,
      firstname: this.getText(c.firstname),
      lastname: this.getText(c.lastname),
      fullname: `${this.getText(c.firstname)} ${this.getText(c.lastname)}`,
      email: this.getText(c.email),
      phone: address ? (this.getText(address.phone_mobile) || this.getText(address.phone) || '') : '',
      city: address ? this.getText(address.city) : '',
      address: address ? `${this.getText(address.address1)} ${this.getText(address.address2 || '')}` : '',
      company: rawCompany,
      vat_number: vat,
      type: (hasCompany || hasVat || hasSiret) ? 'B2B' : 'B2C',
      date_add: c.date_add,
      status: (hasCompany && hasVat) ? 'Completo' : (hasCompany ? 'Empresa' : 'B2B Simple'),
      ps_link: `${this.baseUrl.replace('/api', '')}/admin/index.php?controller=AdminCustomers&id_customer=${c.id}&viewcustomer=1`
    };
  }
}

export const getPrestaClient = () => {
    let url = process.env.PRESTASHOP_URL || '';
    let key = process.env.PRESTASHOP_API_KEY || '';
    if (typeof window === 'undefined') {
        try {
            const fs = eval('require')('fs');
            const path = eval('require')('path');
            const configPath = path.join(process.cwd(), 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (!url) url = config.url || config.PRESTASHOP_URL;
                if (!key) key = config.apiKey || config.ws_key || config.PRESTASHOP_API_KEY;
            }
        } catch (e) {}
    }
    return new PrestaShopClient(url, key);
};
