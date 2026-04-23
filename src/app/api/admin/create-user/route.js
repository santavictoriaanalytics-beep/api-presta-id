import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Inicializamos el SDK de Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'presta-id-monitor-v2' // Forzamos el ID del proyecto
    });
    console.log('Firebase Admin inicializado en presta-id-monitor-v2');
  } catch (error) {
    console.error('Error inicializando Firebase Admin:', error);
  }
}

const auth = admin.auth();
const db = admin.firestore();

export async function POST(request) {
  console.log('Recibida petición de creación de usuario');
  try {
    const body = await request.json();
    const { email, displayName, role } = body;
    console.log('Datos recibidos:', { email, role });

    if (!email) {
      return NextResponse.json({ error: 'El email es obligatorio' }, { status: 400 });
    }

    // 1. Intentamos crear el usuario en Firebase Auth con clave temporal
    let userRecord;
    const tempPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100) + '!';
    
    try {
      userRecord = await auth.createUser({
        email: email,
        emailVerified: false,
        password: tempPassword,
        displayName: displayName || email.split('@')[0],
        disabled: false,
      });
    } catch (createError) {
      // Si el usuario ya existe, forzamos la actualización de su clave a la nueva temporal
      if (createError.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(email);
        await auth.updateUser(userRecord.uid, {
          password: tempPassword
        });
        console.log('Usuario existente actualizado con nueva clave temporal');
      } else {
        throw createError;
      }
    }

    // 2. Registramos o actualizamos en la colección 'users' de Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      email: email,
      displayName: displayName || email.split('@')[0],
      role: role || 'viewer', // Rol por defecto
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    }, { merge: true });

    // 3. Generamos un enlace de activación
    // Esto le enviará un correo oficial de Firebase para que elija su clave
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://presta-id-monitor-v2.web.app'}/login`,
      handleCodeInApp: true,
    };
    
    const inviteLink = await auth.generatePasswordResetLink(email, actionCodeSettings);

    // Nota: Aquí podrías usar un servicio como Resend o SendGrid para enviar un email bonito.
    // Por ahora, devolveremos el éxito y el link (en producción Firebase puede enviar el Reset directamente si lo configuras)

    return NextResponse.json({ 
      success: true, 
      uid: userRecord.uid,
      tempPassword: tempPassword,
      message: 'Usuario activado correctamente'
    });

  } catch (error) {
    console.error('ERROR CRÍTICO EN CREATE-USER:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code || 'unknown'
    }, { status: 500 });
  }
}
