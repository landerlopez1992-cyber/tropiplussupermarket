// Sistema de Autenticación con Square Customers API

// Toggle de visibilidad de contraseña
document.addEventListener('DOMContentLoaded', function() {
    // Toggle para login
    const togglePassword = document.getElementById('toggle-password');
    const loginPassword = document.getElementById('login-password');
    
    if (togglePassword && loginPassword) {
        togglePassword.addEventListener('click', () => {
            const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPassword.setAttribute('type', type);
            togglePassword.querySelector('i').classList.toggle('fa-eye');
            togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Toggle para registro
    const togglePasswordRegister = document.getElementById('toggle-password-register');
    const registerPassword = document.getElementById('register-password');
    
    if (togglePasswordRegister && registerPassword) {
        togglePasswordRegister.addEventListener('click', () => {
            const type = registerPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            registerPassword.setAttribute('type', type);
            togglePasswordRegister.querySelector('i').classList.toggle('fa-eye');
            togglePasswordRegister.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    const togglePasswordConfirm = document.getElementById('toggle-password-confirm');
    const registerPasswordConfirm = document.getElementById('register-password-confirm');
    
    if (togglePasswordConfirm && registerPasswordConfirm) {
        togglePasswordConfirm.addEventListener('click', () => {
            const type = registerPasswordConfirm.getAttribute('type') === 'password' ? 'text' : 'password';
            registerPasswordConfirm.setAttribute('type', type);
            togglePasswordConfirm.querySelector('i').classList.toggle('fa-eye');
            togglePasswordConfirm.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Formulario de registro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// Función para manejar el login
async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('login-submit-btn');
    const errorDiv = document.getElementById('login-error');
    const successDiv = document.getElementById('login-success');
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Ocultar mensajes anteriores
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';

    // Validación básica
    if (!email || !password) {
        showError(errorDiv, 'Por favor, complete todos los campos');
        return;
    }

    try {
        // Deshabilitar botón
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Iniciando sesión...';
        }

        // Buscar cliente en Square por email
        console.log('🔍 Buscando customer con email:', email);
        const customer = await findCustomerByEmail(email);
        
        if (!customer) {
            console.error('❌ Customer no encontrado para email:', email);
            showError(errorDiv, 'Correo electrónico o contraseña incorrectos');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'INICIAR SESIÓN';
            }
            return;
        }

        console.log('✅ Customer encontrado:', customer.id);

        // Verificar contraseña
        // Buscar contraseña guardada en localStorage (asociada al customer ID)
        const storedPassword = localStorage.getItem(`tropiplus_user_password_${customer.id}`);
        const storedPasswordBase64 = localStorage.getItem('tropiplus_user_password');
        
        let passwordValid = false;
        
        console.log('🔐 Verificando contraseña...');
        console.log('Customer ID:', customer.id);
        console.log('Stored password (by ID):', storedPassword ? 'existe' : 'no existe');
        console.log('Stored password (general):', storedPasswordBase64 ? 'existe' : 'no existe');
        
        if (storedPassword) {
            // Si hay contraseña guardada con el ID del customer
            try {
                const decodedPassword = atob(storedPassword);
                passwordValid = (decodedPassword === password);
                console.log('🔐 Contraseña verificada (por ID):', passwordValid);
            } catch (e) {
                console.error('Error decodificando contraseña:', e);
                passwordValid = false;
            }
        } else if (storedPasswordBase64) {
            // Fallback: verificar contraseña general
            try {
                const decodedPassword = atob(storedPasswordBase64);
                passwordValid = (decodedPassword === password);
                console.log('🔐 Contraseña verificada (general):', passwordValid);
            } catch (e) {
                console.error('Error decodificando contraseña:', e);
                passwordValid = false;
            }
        } else {
            // Si no hay contraseña guardada, verificar si el customer tiene note con password
            // O permitir login si el customer existe en Square (para usuarios existentes)
            console.warn('⚠️ No hay contraseña guardada en localStorage');
            
            // Intentar obtener la contraseña desde customer.note en Square
            if (customer.note) {
                try {
                    const noteData = JSON.parse(customer.note);
                    if (noteData.password) {
                        passwordValid = (noteData.password === password);
                        console.log('🔐 Contraseña verificada desde Square note:', passwordValid);
                    } else {
                        // Si no hay password en note, permitir login para usuarios existentes (modo demo)
                        // TODO: En producción, esto debería requerir autenticación real
                        console.warn('⚠️ No hay password en note, permitiendo login (modo demo)');
                        passwordValid = true; // Permitir login para usuarios existentes en Square
                    }
                } catch (e) {
                    // Si note no es JSON, permitir login
                    console.warn('⚠️ Note no es JSON válido, permitiendo login');
                    passwordValid = true;
                }
            } else {
                // Permitir login si el customer existe en Square (para usuarios existentes)
                console.warn('⚠️ No hay note en customer, permitiendo login');
                passwordValid = true;
            }
        }

        if (!passwordValid) {
            console.error('❌ Contraseña incorrecta');
            showError(errorDiv, 'Correo electrónico o contraseña incorrectos');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'INICIAR SESIÓN';
            }
            return;
        }
        
        console.log('✅ Contraseña válida, procediendo con login');

        const isAdmin = customerNote.includes('"isAdmin":true') || 
                       customerNote.includes('"credenciales":true') ||
                       customerEmail.toLowerCase() === 'tallercell0133@gmail.com'; // Usuario específico como admin
        const isEmployee = isEmployeeFromNoteOrEmail(customerNote, customerEmail) || isAdmin;
        
        console.log('🔐 Verificando admin:', {
            email: customerEmail,
            note: customerNote,
            isAdmin: isAdmin,
            isEmployee: isEmployee
        });

        // Crear sesión de usuario
        const userSession = {
            id: customer.id,
            email: customer.email_address,
            given_name: customer.given_name,
            family_name: customer.family_name,
            phone_number: customer.phone_number,
            address: customer.address,
            loggedIn: true,
            isAdmin: isAdmin,
            isEmployee: isEmployee,
            role: isAdmin ? 'admin' : (isEmployee ? 'empleado' : 'customer'),
            credenciales: isAdmin,
            loginTime: Date.now()
        };

        // Guardar sesión en localStorage
        localStorage.setItem('tropiplus_user', JSON.stringify(userSession));
        localStorage.setItem('tropiplus_user_id', customer.id);
        
        console.log('✅ Sesión guardada:', userSession);

        // Verificar que la sesión se guardó correctamente
        const savedSession = localStorage.getItem('tropiplus_user');
        if (!savedSession) {
            throw new Error('Error al guardar la sesión');
        }
        
        console.log('✅ Sesión guardada correctamente:', JSON.parse(savedSession));

        // Mostrar spinner de carga
        showLoginSpinner();

        // Verificar que isUserLoggedIn funciona antes de redirigir
        if (typeof isUserLoggedIn === 'function') {
            const isLoggedIn = isUserLoggedIn();
            console.log('🔐 Estado de login verificado:', isLoggedIn);
            if (!isLoggedIn) {
                console.error('❌ Error: isUserLoggedIn retorna false después de guardar sesión');
            }
        }

        // Redirigir después de 1 segundo a la página home
        console.log('🔄 Redirigiendo a index.html en 1 segundo...');
        setTimeout(() => {
            console.log('✅ Redirigiendo ahora a index.html...');
            // Forzar recarga completa (aumentado medio segundo más)
            window.location.replace('index.html');
        }, 1500);

    } catch (error) {
        console.error('Error en login:', error);
        showError(errorDiv, 'Error al iniciar sesión. Por favor, intente nuevamente.');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'INICIAR SESIÓN';
        }
    }
}

// Función para manejar el registro
async function handleRegister(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('register-submit-btn');
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');

    // Obtener valores del formulario
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const address = document.getElementById('register-address').value;
    const country = document.getElementById('register-country').value;
    const state = document.getElementById('register-state').value;
    const city = document.getElementById('register-city').value;
    const postalCode = document.getElementById('register-postal').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const terms = document.getElementById('register-terms').checked;

    // Ocultar mensajes anteriores
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';

    // Validaciones
    if (!name || !email || !address || !country || !state || !city || !postalCode || !password || !passwordConfirm) {
        showError(errorDiv, 'Por favor, complete todos los campos obligatorios');
        return;
    }

    if (password !== passwordConfirm) {
        showError(errorDiv, 'Las contraseñas no coinciden');
        return;
    }

    if (password.length < 8) {
        showError(errorDiv, 'La contraseña debe tener al menos 8 caracteres');
        return;
    }

    if (!terms) {
        showError(errorDiv, 'Debe aceptar los términos y condiciones');
        return;
    }

    try {
        // Deshabilitar botón
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando cuenta...';
        }

        // Verificar si el email ya existe
        const existingCustomer = await findCustomerByEmail(email);
        if (existingCustomer) {
            showError(errorDiv, 'Este correo electrónico ya está registrado');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'CREAR CUENTA';
            }
            return;
        }

        // Crear cliente en Square
        const customerData = {
            given_name: name.split(' ')[0] || name,
            family_name: name.split(' ').slice(1).join(' ') || '',
            email_address: email,
            phone_number: phone || undefined,
            address: {
                address_line_1: address,
                locality: city,
                administrative_district_level_1: state,
                postal_code: postalCode,
                country: country
            },
            note: `Usuario registrado desde web - ${new Date().toISOString()}`
        };

        const newCustomer = await createSquareCustomer(customerData);

        if (newCustomer && newCustomer.customer) {
            // Guardar información del usuario (sin contraseña por seguridad)
            // En producción, la contraseña debe manejarse en el servidor
            // Verificar si el usuario es administrador desde customer.note o metadata
            const customerNote = newCustomer.customer.note || '';
            const isAdmin = customerNote.includes('"isAdmin":true') || 
                           customerNote.includes('"credenciales":true') ||
                           newCustomer.customer.email_address === 'tallercell0133@gmail.com';
            const isEmployee = isEmployeeFromNoteOrEmail(customerNote, newCustomer.customer.email_address) || isAdmin;
            
            const userSession = {
                id: newCustomer.customer.id,
                email: newCustomer.customer.email_address,
                given_name: newCustomer.customer.given_name,
                family_name: newCustomer.customer.family_name,
                phone_number: newCustomer.customer.phone_number,
                address: newCustomer.customer.address,
                loggedIn: true,
                isAdmin: isAdmin,
                isEmployee: isEmployee,
                role: isAdmin ? 'admin' : (isEmployee ? 'empleado' : 'customer'),
                credenciales: isAdmin,
                loginTime: Date.now()
            };

            localStorage.setItem('tropiplus_user', JSON.stringify(userSession));
            localStorage.setItem('tropiplus_user_id', newCustomer.customer.id);
            // Guardar contraseña asociada al customer ID
            localStorage.setItem(`tropiplus_user_password_${newCustomer.customer.id}`, btoa(password)); // Solo para demo, NO hacer esto en producción
            localStorage.setItem('tropiplus_user_password', btoa(password)); // Fallback
            
            // También guardar contraseña en customer.note en Square (para sincronización)
            try {
                const currentNote = newCustomer.customer.note || '{}';
                let noteData = {};
                try {
                    noteData = JSON.parse(currentNote);
                } catch (e) {
                    noteData = {};
                }
                noteData.password = password; // En producción, esto debe ser un hash
                noteData.created_at = new Date().toISOString();
                
                // Actualizar customer con password en note
                const apiCall = window.squareApiCall || squareApiCall;
                await apiCall(
                    `/v2/customers/${newCustomer.customer.id}`,
                    'PUT',
                    {
                        note: JSON.stringify(noteData)
                    }
                );
                console.log('✅ Contraseña guardada en Square customer.note');
            } catch (error) {
                console.warn('⚠️ No se pudo guardar contraseña en Square note:', error);
            }

            // Mostrar éxito
            if (successDiv) {
                successDiv.textContent = '¡Cuenta creada exitosamente! Redirigiendo...';
                successDiv.style.display = 'block';
            }

            // Redirigir después de 1 segundo a la página home
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            throw new Error('No se pudo crear la cuenta');
        }

    } catch (error) {
        console.error('Error en registro:', error);
        showError(errorDiv, error.message || 'Error al crear la cuenta. Por favor, intente nuevamente.');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'CREAR CUENTA';
        }
    }
}

// Función para buscar cliente por email en Square
async function findCustomerByEmail(email) {
    try {
        console.log('📡 Buscando customer en Square con email:', email);
        
        // Usar window.squareApiCall directamente para asegurar que esté disponible
        const apiCall = window.squareApiCall || squareApiCall;
        
        if (typeof apiCall === 'undefined') {
            throw new Error('squareApiCall no está disponible. Verifica que square-config.js se cargue antes de auth.js');
        }
        
        const response = await apiCall(
            '/v2/customers/search',
            'POST',
            {
                query: {
                    filter: {
                        email_address: {
                            exact: email
                        }
                    }
                },
                limit: 1
            }
        );

        console.log('📥 Respuesta de Square:', response);

        if (response && response.customers && response.customers.length > 0) {
            console.log('✅ Customer encontrado:', response.customers[0].id);
            return response.customers[0];
        }
        
        console.warn('⚠️ No se encontró customer con ese email');
        return null;
    } catch (error) {
        console.error('❌ Error buscando cliente:', error);
        console.error('Detalles del error:', error.message, error.stack);
        return null;
    }
}

// Función para crear cliente en Square
async function createSquareCustomer(customerData) {
    try {
        const apiCall = window.squareApiCall || squareApiCall;
        const response = await apiCall(
            '/v2/customers',
            'POST',
            customerData
        );

        console.log('✅ Cliente creado en Square:', response);
        return response;
    } catch (error) {
        console.error('❌ Error creando cliente en Square:', error);
        throw error;
    }
}

// Función para mostrar errores
function showError(errorDiv, message) {
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Función para verificar si el usuario está logueado
function isUserLoggedIn() {
    const user = localStorage.getItem('tropiplus_user');
    if (!user) {
        console.log('🔐 No hay sesión guardada en localStorage');
        return false;
    }
    
    try {
        const userData = JSON.parse(user);
        const isLoggedIn = userData.loggedIn === true;
        console.log('🔐 Estado de login:', isLoggedIn, 'Usuario:', userData.email);
        return isLoggedIn;
    } catch (e) {
        console.error('❌ Error parseando sesión:', e);
        return false;
    }
}

// Función para obtener datos del usuario actual
function getCurrentUser() {
    const user = localStorage.getItem('tropiplus_user');
    if (!user) {
        console.log('👤 No hay usuario en localStorage');
        return null;
    }
    
    try {
        const userData = JSON.parse(user);
        console.log('👤 Usuario obtenido:', userData.email);
        return userData;
    } catch (e) {
        console.error('❌ Error parseando usuario:', e);
        return null;
    }
}

// Empleados: agrega emails aquí O en Square Customer note: {"isEmployee":true}
const EMPLOYEE_EMAILS = [
    'tallercell0133@gmail.com'
];

function isEmployeeFromNoteOrEmail(note, email) {
    const n = String(note || '');
    const e = String(email || '').toLowerCase().trim();
    if (EMPLOYEE_EMAILS.map(x => x.toLowerCase()).includes(e)) return true;
    if (n.includes('"isEmployee":true') || n.includes('"role":"empleado"') || n.includes('"role":"employee"')) return true;
    return false;
}

// Función para verificar si el usuario es administrador
function isUserAdmin() {
    const user = getCurrentUser();
    if (!user) return false;
    return user.isAdmin === true || user.credenciales === true;
}

function isUserEmployee() {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.isEmployee === true || user.role === 'empleado' || user.role === 'employee') return true;
    if (isUserAdmin()) return true;
    return isEmployeeFromNoteOrEmail('', user.email);
}

// Función para cerrar sesión
function logout() {
    console.log('🚪 Cerrando sesión...');
    localStorage.removeItem('tropiplus_user');
    localStorage.removeItem('tropiplus_user_id');
    localStorage.removeItem('tropiplus_user_password');
    // Limpiar todas las contraseñas guardadas
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('tropiplus_user_password_')) {
            localStorage.removeItem(key);
        }
    });
    console.log('✅ Sesión cerrada, redirigiendo...');
    window.location.href = 'index.html';
}

// Función para mostrar spinner de carga después del login
function showLoginSpinner() {
    // Crear overlay de carga
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'login-loading-overlay';
    loadingOverlay.className = 'login-loading-overlay';
    
    // Crear spinner
    const spinner = document.createElement('div');
    spinner.className = 'login-spinner';
    
    // Logo dentro del spinner
    const logoImg = document.createElement('img');
    logoImg.src = 'images/logo.png';
    logoImg.alt = 'TropiParts';
    logoImg.className = 'login-spinner-logo';
    
    spinner.appendChild(logoImg);
    loadingOverlay.appendChild(spinner);
    
    // Agregar al body
    document.body.appendChild(loadingOverlay);
    
    // Animar el spinner
    setTimeout(() => {
        loadingOverlay.classList.add('active');
    }, 10);
}

// Hacer funciones disponibles globalmente
window.isUserLoggedIn = isUserLoggedIn;
window.getCurrentUser = getCurrentUser;
window.isUserAdmin = isUserAdmin;
window.isUserEmployee = isUserEmployee;
window.EMPLOYEE_EMAILS = EMPLOYEE_EMAILS;
window.logout = logout;
