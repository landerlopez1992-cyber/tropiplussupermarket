// Página de Cuenta de Usuario

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está logueado
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
        loadUserData();
        initAccountForm();
        initAdminLink();
    } else {
        // Redirigir a login si no está autenticado
        window.location.href = 'login.html';
    }
});

function initAdminLink() {
    // Mostrar enlace de Admin solo si el usuario es administrador
    if (typeof isUserAdmin === 'function' && isUserAdmin()) {
        const adminLink = document.getElementById('nav-admin');
        if (adminLink) {
            adminLink.style.display = 'block';
        }
    } else {
        const adminLink = document.getElementById('nav-admin');
        if (adminLink) {
            adminLink.style.display = 'none';
        }
    }
}

function loadUserData() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Cargar datos del usuario desde Square
    loadCustomerFromSquare(user.id);
    
    // Mostrar nombre en el header
    const userAccountText = document.getElementById('user-account-text');
    const userAccountLink = document.getElementById('user-account-link');
    if (userAccountText) {
        const givenName = String(user.given_name || '').trim();
        const familyName = String(user.family_name || '').trim();
        const userName = givenName && familyName
            ? `${givenName} ${familyName.charAt(0)}.`
            : (givenName || (user.email ? String(user.email).split('@')[0] : 'Usuario'));
        userAccountText.textContent = userName;
    }
    if (userAccountLink) {
        userAccountLink.classList.add('user-logged-in');
    }
}

async function loadCustomerFromSquare(customerId) {
    try {
        const response = await squareApiCall(`/v2/customers/${customerId}`, 'GET');
        
        if (response && response.customer) {
            const customer = response.customer;
            populateAccountForm(customer);
        } else {
            // Si no se puede cargar desde Square, usar datos de localStorage
            const user = getCurrentUser();
            if (user) {
                populateAccountFormFromLocal(user);
            }
        }
    } catch (error) {
        console.error('Error cargando cliente desde Square:', error);
        // Usar datos de localStorage como fallback
        const user = getCurrentUser();
        if (user) {
            populateAccountFormFromLocal(user);
        }
    }
}

function populateAccountForm(customer) {
    // Nombre completo
    const fullName = `${customer.given_name || ''} ${customer.family_name || ''}`.trim();
    document.getElementById('account-name').value = fullName || '';
    
    // Email
    document.getElementById('account-email').value = customer.email_address || '';
    
    // Dirección
    if (customer.address) {
        document.getElementById('account-address').value = customer.address.address_line_1 || '';
        document.getElementById('account-city').value = customer.address.locality || '';
        document.getElementById('account-state').value = customer.address.administrative_district_level_1 || '';
        document.getElementById('account-postal').value = customer.address.postal_code || '';
        document.getElementById('account-country').value = customer.address.country || '';
    }
    
    // Teléfono
    document.getElementById('account-phone').value = customer.phone_number || '';
}

function populateAccountFormFromLocal(user) {
    // Usar datos de localStorage
    document.getElementById('account-name').value = `${user.given_name || ''} ${user.family_name || ''}`.trim();
    document.getElementById('account-email').value = user.email || '';
    
    if (user.address) {
        document.getElementById('account-address').value = user.address.address_line_1 || '';
        document.getElementById('account-city').value = user.address.locality || '';
        document.getElementById('account-state').value = user.address.administrative_district_level_1 || '';
        document.getElementById('account-postal').value = user.address.postal_code || '';
        document.getElementById('account-country').value = user.address.country || '';
    }
    
    document.getElementById('account-phone').value = user.phone_number || '';
}

function initAccountForm() {
    const btnModify = document.getElementById('btn-modify');
    const btnCancel = document.getElementById('btn-cancel');
    const accountForm = document.getElementById('account-form');
    const formActions = document.getElementById('account-form-actions');
    const inputs = accountForm.querySelectorAll('.form-input');
    
    let isEditing = false;
    
    if (btnModify) {
        btnModify.addEventListener('click', () => {
            isEditing = true;
            inputs.forEach(input => {
                input.removeAttribute('readonly');
                input.style.backgroundColor = '#fff';
            });
            formActions.style.display = 'flex';
            formActions.style.gap = '12px';
            btnModify.style.display = 'none';
        });
    }
    
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            isEditing = false;
            inputs.forEach(input => {
                input.setAttribute('readonly', 'readonly');
                input.style.backgroundColor = '#f5f5f5';
            });
            formActions.style.display = 'none';
            if (btnModify) btnModify.style.display = 'inline-block';
            // Recargar datos originales
            loadUserData();
        });
    }
    
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!isEditing) return;
            
            const submitBtn = accountForm.querySelector('button[type="submit"]');
            const errorDiv = document.getElementById('account-error');
            const successDiv = document.getElementById('account-success');
            
            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Guardando...';
                }
                
                const user = getCurrentUser();
                if (!user || !user.id) {
                    throw new Error('Usuario no encontrado');
                }
                
                // Preparar datos para actualizar
                const nameParts = document.getElementById('account-name').value.split(' ');
                const customerData = {
                    given_name: nameParts[0] || '',
                    family_name: nameParts.slice(1).join(' ') || '',
                    email_address: document.getElementById('account-email').value,
                    phone_number: document.getElementById('account-phone').value || undefined,
                    address: {
                        address_line_1: document.getElementById('account-address').value,
                        locality: document.getElementById('account-city').value,
                        administrative_district_level_1: document.getElementById('account-state').value,
                        postal_code: document.getElementById('account-postal').value,
                        country: document.getElementById('account-country').value
                    }
                };
                
                // Actualizar en Square
                const response = await squareApiCall(
                    `/v2/customers/${user.id}`,
                    'PUT',
                    customerData
                );
                
                if (response && response.customer) {
                    // Actualizar localStorage
                    const updatedUser = {
                        ...user,
                        given_name: response.customer.given_name,
                        family_name: response.customer.family_name,
                        email: response.customer.email_address,
                        phone_number: response.customer.phone_number,
                        address: response.customer.address
                    };
                    localStorage.setItem('tropiplus_user', JSON.stringify(updatedUser));
                    
                    // Mostrar éxito
                    if (successDiv) {
                        successDiv.textContent = 'Datos actualizados correctamente';
                        successDiv.style.display = 'block';
                        setTimeout(() => {
                            successDiv.style.display = 'none';
                        }, 3000);
                    }
                    
                    // Salir del modo edición
                    isEditing = false;
                    inputs.forEach(input => {
                        input.setAttribute('readonly', 'readonly');
                        input.style.backgroundColor = '#f5f5f5';
                    });
                    formActions.style.display = 'none';
                    if (btnModify) btnModify.style.display = 'inline-block';
                    
                } else {
                    throw new Error('No se pudo actualizar la información');
                }
                
            } catch (error) {
                console.error('Error actualizando cuenta:', error);
                if (errorDiv) {
                    errorDiv.textContent = error.message || 'Error al actualizar los datos. Por favor, intente nuevamente.';
                    errorDiv.style.display = 'block';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Guardar Cambios';
                }
            }
        });
    }
}
