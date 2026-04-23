import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Inicializamos el SDK de Admin (solo una vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // Usa los permisos nativos de Firebase App Hosting
    projectId: 'presta-id-monitor-v2'
  });
}

const auth = admin.auth();

export async function POST(request) {
  try {
    const { email, displayName } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'El email es obligatorio' }, { status: 400 });
    }

    // 1. Intentamos crear el usuario en Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        emailVerified: false,
        displayName: displayName || email.split('@')[0],
        disabled: false,
      });
    } catch (createError) {
      // Si el usuario ya existe, lo recuperamos
      if (createError.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(email);
      } else {
        throw createError;
      }
    }

    // 2. Generamos un enlace de restablecimiento de contraseña / activación
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
      message: 'Usuario activado correctamente',
      inviteLink: inviteLink // Puedes copiar este link y dárselo si quieres, o el sistema lo enviará si activas la opción en Firebase
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
