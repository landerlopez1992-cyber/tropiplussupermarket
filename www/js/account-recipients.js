// Página de Mis Destinatarios

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está logueado
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
        initRecipientsPage();
    } else {
        window.location.href = 'login.html';
    }
});

function initRecipientsPage() {
    const btnAddRecipient = document.getElementById('btn-add-recipient');
    const recipientsList = document.getElementById('recipients-list');
    
    // Botón agregar destinatario
    if (btnAddRecipient) {
        btnAddRecipient.addEventListener('click', () => {
            showAddRecipientModal();
        });
    }
    
    // Cargar destinatarios
    loadRecipients();
}

async function loadRecipients() {
    const recipientsList = document.getElementById('recipients-list');
    if (!recipientsList) return;
    
    try {
        const user = getCurrentUser();
        if (!user || !user.id) {
            throw new Error('Usuario no encontrado');
        }
        
        // Obtener destinatarios desde Square (guardados en customer.note)
        const recipients = await getRecipientsFromSquare(user.id);
        
        if (!recipients || recipients.length === 0) {
            // Mostrar mensaje vacío
            recipientsList.innerHTML = `
                <div class="recipients-empty">
                    <i class="fas fa-address-book"></i>
                    <h3>No tiene destinatarios guardados</h3>
                    <p>Agregue destinatarios para facilitar sus compras</p>
                </div>
            `;
            return;
        }
        
        // Renderizar destinatarios
        renderRecipients(recipients, recipientsList);
        
    } catch (error) {
        console.error('Error cargando destinatarios:', error);
        recipientsList.innerHTML = `
            <div class="recipients-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar destinatarios</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderRecipients(recipients, container) {
    container.innerHTML = '';
    
    recipients.forEach((recipient, index) => {
        const recipientCard = createRecipientCard(recipient, index);
        container.appendChild(recipientCard);
    });
}

function createRecipientCard(recipient, index) {
    const card = document.createElement('div');
    card.className = 'recipient-card';
    
    card.innerHTML = `
        <div class="recipient-card-header">
            <div class="recipient-info">
                <h4 class="recipient-name">${recipient.name || 'Destinatario'}</h4>
                <p class="recipient-address">${formatAddress(recipient.address)}</p>
                <p class="recipient-phone">${recipient.phone || 'Sin teléfono'}</p>
            </div>
            <div class="recipient-actions">
                <button class="recipient-edit-btn" data-index="${index}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="recipient-delete-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    // Event listeners
    const editBtn = card.querySelector('.recipient-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            showEditRecipientModal(recipient, index);
        });
    }
    
    const deleteBtn = card.querySelector('.recipient-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            deleteRecipient(index);
        });
    }
    
    return card;
}

function formatAddress(address) {
    if (!address) return 'Sin dirección';
    const parts = [];
    if (address.address_line_1) parts.push(address.address_line_1);
    if (address.locality) parts.push(address.locality);
    if (address.administrative_district_level_1) parts.push(address.administrative_district_level_1);
    if (address.postal_code) parts.push(address.postal_code);
    if (address.country) parts.push(address.country);
    return parts.join(', ') || 'Sin dirección';
}

function showAddRecipientModal() {
    const modal = createRecipientModal();
    document.body.appendChild(modal);
    
    // Mostrar modal
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function showEditRecipientModal(recipient, index) {
    const modal = createRecipientModal(recipient, index);
    document.body.appendChild(modal);
    
    // Llenar formulario
    if (recipient) {
        document.getElementById('recipient-modal-name').value = recipient.name || '';
        document.getElementById('recipient-modal-address').value = recipient.address?.address_line_1 || '';
        document.getElementById('recipient-modal-city').value = recipient.address?.locality || '';
        document.getElementById('recipient-modal-state').value = recipient.address?.administrative_district_level_1 || '';
        document.getElementById('recipient-modal-postal').value = recipient.address?.postal_code || '';
        document.getElementById('recipient-modal-country').value = recipient.address?.country || '';
        document.getElementById('recipient-modal-phone').value = recipient.phone || '';
    }
    
    // Mostrar modal
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function createRecipientModal(recipient = null, index = null) {
    const modal = document.createElement('div');
    modal.className = 'recipient-modal';
    modal.innerHTML = `
        <div class="recipient-modal-overlay"></div>
        <div class="recipient-modal-content">
            <div class="recipient-modal-header">
                <h3>${recipient ? 'Editar' : 'Agregar'} Destinatario</h3>
                <button class="recipient-modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="recipient-form" class="recipient-modal-form">
                <div class="form-group">
                    <label for="recipient-modal-name" class="form-label">Nombre completo *</label>
                    <input type="text" id="recipient-modal-name" class="form-input" required>
                </div>
                <div class="form-group">
                    <label for="recipient-modal-address" class="form-label">Dirección *</label>
                    <input type="text" id="recipient-modal-address" class="form-input" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="recipient-modal-city" class="form-label">Ciudad *</label>
                        <input type="text" id="recipient-modal-city" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="recipient-modal-state" class="form-label">Estado/Provincia *</label>
                        <input type="text" id="recipient-modal-state" class="form-input" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="recipient-modal-postal" class="form-label">Código postal *</label>
                        <input type="text" id="recipient-modal-postal" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="recipient-modal-country" class="form-label">País *</label>
                        <select id="recipient-modal-country" class="form-input" required>
                            <option value="">Seleccione</option>
                            <option value="US">Estados Unidos</option>
                            <option value="CU">Cuba</option>
                            <option value="MX">México</option>
                            <option value="ES">España</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="recipient-modal-phone" class="form-label">Teléfono</label>
                    <input type="tel" id="recipient-modal-phone" class="form-input">
                </div>
                <div class="recipient-modal-actions">
                    <button type="submit" class="auth-submit-btn">
                        ${recipient ? 'Actualizar' : 'Agregar'} Destinatario
                    </button>
                    <button type="button" class="auth-link-btn recipient-modal-cancel">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Event listeners
    const closeBtn = modal.querySelector('.recipient-modal-close');
    const cancelBtn = modal.querySelector('.recipient-modal-cancel');
    const overlay = modal.querySelector('.recipient-modal-overlay');
    const form = modal.querySelector('#recipient-form');
    
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveRecipient(recipient, index);
            closeModal();
        });
    }
    
    return modal;
}

async function saveRecipient(recipient, index) {
    try {
        const user = getCurrentUser();
        if (!user || !user.id) {
            throw new Error('Usuario no encontrado');
        }
        
        const recipientData = {
            name: document.getElementById('recipient-modal-name').value,
            address: {
                address_line_1: document.getElementById('recipient-modal-address').value,
                locality: document.getElementById('recipient-modal-city').value,
                administrative_district_level_1: document.getElementById('recipient-modal-state').value,
                postal_code: document.getElementById('recipient-modal-postal').value,
                country: document.getElementById('recipient-modal-country').value
            },
            phone: document.getElementById('recipient-modal-phone').value || undefined
        };
        
        // Obtener destinatarios actuales
        const recipients = await getRecipientsFromSquare(user.id);
        
        if (recipient && index !== null) {
            // Editar destinatario existente
            recipients[index] = recipientData;
        } else {
            // Agregar nuevo destinatario
            recipients.push(recipientData);
        }
        
        // Guardar en Square
        await saveRecipientsToSquare(user.id, recipients);
        
        // Recargar lista
        loadRecipients();
        
    } catch (error) {
        console.error('Error guardando destinatario:', error);
        alert('Error al guardar destinatario: ' + error.message);
    }
}

async function deleteRecipient(index) {
    if (!confirm('¿Está seguro de que desea eliminar este destinatario?')) {
        return;
    }
    
    try {
        const user = getCurrentUser();
        if (!user || !user.id) {
            throw new Error('Usuario no encontrado');
        }
        
        // Obtener destinatarios actuales
        const recipients = await getRecipientsFromSquare(user.id);
        
        // Eliminar destinatario
        recipients.splice(index, 1);
        
        // Guardar en Square
        await saveRecipientsToSquare(user.id, recipients);
        
        // Recargar lista
        loadRecipients();
        
    } catch (error) {
        console.error('Error eliminando destinatario:', error);
        alert('Error al eliminar destinatario: ' + error.message);
    }
}

// Obtener destinatarios desde Square (guardados en customer.note)
async function getRecipientsFromSquare(customerId) {
    try {
        if (typeof squareApiCall !== 'function') {
            throw new Error('squareApiCall no está disponible');
        }
        const response = await squareApiCall(`/v2/customers/${customerId}`, 'GET');
        
        if (response && response.customer && response.customer.note) {
            try {
                const noteData = JSON.parse(response.customer.note);
                if (noteData.recipients && Array.isArray(noteData.recipients)) {
                    return noteData.recipients;
                }
            } catch (e) {
                console.warn('Note no es JSON válido');
            }
        }
        
        // Fallback a localStorage
        const localRecipients = JSON.parse(localStorage.getItem('tropiplus_recipients')) || [];
        return localRecipients;
        
    } catch (error) {
        console.error('Error obteniendo destinatarios desde Square:', error);
        const localRecipients = JSON.parse(localStorage.getItem('tropiplus_recipients')) || [];
        return localRecipients;
    }
}

// Guardar destinatarios en Square (en customer.note)
async function saveRecipientsToSquare(customerId, recipients) {
    try {
        if (typeof squareApiCall !== 'function') {
            throw new Error('squareApiCall no está disponible');
        }
        const user = getCurrentUser();
        if (!user) return;
        
        // Obtener nota actual del cliente
        const customerResponse = await squareApiCall(`/v2/customers/${customerId}`, 'GET');
        let noteData = {};
        
        if (customerResponse && customerResponse.customer && customerResponse.customer.note) {
            try {
                noteData = JSON.parse(customerResponse.customer.note);
            } catch (e) {
                noteData = {};
            }
        }
        
        // Actualizar recipients en note
        noteData.recipients = recipients;
        noteData.lastUpdated = new Date().toISOString();
        
        // Actualizar cliente en Square
        await squareApiCall(
            `/v2/customers/${customerId}`,
            'PUT',
            {
                note: JSON.stringify(noteData)
            }
        );
        
        // También guardar en localStorage como backup
        localStorage.setItem('tropiplus_recipients', JSON.stringify(recipients));
        
        console.log('✅ Destinatarios guardados en Square');
        
    } catch (error) {
        console.error('Error guardando destinatarios en Square:', error);
        // Fallback: solo guardar en localStorage
        localStorage.setItem('tropiplus_recipients', JSON.stringify(recipients));
    }
}
