// Página de Cambiar Contraseña

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está logueado
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
        initPasswordForm();
    } else {
        window.location.href = 'login.html';
    }
});

function initPasswordForm() {
    // Toggle de visibilidad de contraseñas
    const toggles = [
        { btn: 'toggle-current-password', input: 'current-password' },
        { btn: 'toggle-new-password', input: 'new-password' },
        { btn: 'toggle-confirm-password', input: 'confirm-password' }
    ];
    
    toggles.forEach(({ btn, input }) => {
        const toggleBtn = document.getElementById(btn);
        const passwordInput = document.getElementById(input);
        
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                toggleBtn.querySelector('i').classList.toggle('fa-eye');
                toggleBtn.querySelector('i').classList.toggle('fa-eye-slash');
            });
        }
    });
    
    // Formulario
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('password-error');
    const successDiv = document.getElementById('password-success');
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Ocultar mensajes anteriores
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
        showError(errorDiv, 'Por favor, complete todos los campos');
        return;
    }
    
    if (newPassword.length < 8) {
        showError(errorDiv, 'La nueva contraseña debe tener al menos 8 caracteres');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError(errorDiv, 'Las contraseñas no coinciden');
        return;
    }
    
    try {
        // Deshabilitar botón
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Actualizando...';
        }
        
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        
        // Verificar contraseña actual (en producción esto debe hacerse en el servidor)
        const storedPassword = localStorage.getItem('tropiplus_user_password');
        if (storedPassword) {
            const decodedPassword = atob(storedPassword);
            if (decodedPassword !== currentPassword) {
                throw new Error('La contraseña actual es incorrecta');
            }
        }
        
        // Guardar nueva contraseña (en producción esto debe hacerse en el servidor con hash)
        localStorage.setItem('tropiplus_user_password', btoa(newPassword));
        
        // Mostrar éxito
        if (successDiv) {
            successDiv.textContent = 'Contraseña actualizada correctamente';
            successDiv.style.display = 'block';
        }
        
        // Limpiar formulario
        document.getElementById('password-form').reset();
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
            window.location.href = 'account.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        showError(errorDiv, error.message || 'Error al actualizar la contraseña. Por favor, intente nuevamente.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'ACTUALIZAR CONTRASEÑA';
        }
    }
}

function showError(errorDiv, message) {
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}
