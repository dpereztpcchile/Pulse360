// Contraseña por defecto asignada a todo usuario nuevo creado desde
// Admin > Usuarios. El usuario queda marcado con mustChangePassword=true
// y el sistema lo obliga a definir una contraseña propia en su primer
// inicio de sesión (ver middleware.ts y /cambiar-clave).
export const DEFAULT_PASSWORD = '123456'
