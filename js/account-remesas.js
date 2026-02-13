// Página de Mis Remesas - Ver estado de remesas y código de confirmación

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    initRemesasPage();
});

function initRemesasPage() {
    const tabs = document.querySelectorAll('.remesas-tabs .order-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Actualizar tabs activos
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = 'var(--gray-text)';
            });
            tab.classList.add('active');
            tab.style.borderBottomColor = 'var(--green-categories)';
            tab.style.color = 'var(--green-categories)';
            
            // Cargar remesas según el filtro
            const filter = tab.dataset.tab;
            loadUserRemesas(filter === 'all' ? null : filter);
        });
    });
    
    // Cargar remesas inicialmente
    loadUserRemesas();
}

async function loadUserRemesas(statusFilter = null) {
    const container = document.getElementById('remesas-list');
    if (!container) return;
    
    container.innerHTML = `
        <div class="orders-empty">
            <div class="orders-empty-icon">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <h3>Cargando remesas...</h3>
        </div>
    `;
    
    try {
        // Obtener usuario actual
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        if (!user || !user.id) {
            throw new Error('Usuario no autenticado');
        }
        
        if (typeof window.getUserRemesasFromSupabase !== 'function') {
            throw new Error('Función getUserRemesasFromSupabase no disponible. Verifica que supabase-config.js esté cargado.');
        }
        
        const remesas = await window.getUserRemesasFromSupabase(user.id);
        
        // Filtrar por estado si se especifica
        let filteredRemesas = remesas;
        if (statusFilter) {
            if (statusFilter === 'pending') {
                filteredRemesas = remesas.filter(r => r.status === 'pending');
            } else if (statusFilter === 'delivered') {
                filteredRemesas = remesas.filter(r => r.status === 'delivered');
            }
        }
        
        renderUserRemesas(filteredRemesas);
    } catch (error) {
        console.error('❌ Error cargando remesas:', error);
        container.innerHTML = `
            <div class="orders-empty">
                <div class="orders-empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error cargando remesas</h3>
                <p>${error.message || 'Error desconocido'}</p>
                <button onclick="loadUserRemesas()" class="auth-submit-btn" style="display: inline-block; margin-top: 20px;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderUserRemesas(remesas) {
    const container = document.getElementById('remesas-list');
    if (!container) return;
    
    if (!remesas || remesas.length === 0) {
        container.innerHTML = `
            <div class="orders-empty">
                <div class="orders-empty-icon">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <h3>No se han encontrado remesas.</h3>
                <p>Cuando envíes una remesa, aparecerá aquí con su código de confirmación.</p>
                <a href="index.html" class="auth-submit-btn" style="display: inline-block; margin-top: 20px;">
                    <i class="fas fa-coins"></i> Enviar Remesa
                </a>
            </div>
        `;
        return;
    }
    
    const remesasHtml = remesas.map(remesa => {
        const statusColors = {
            pending: '#ff9800',
            delivered: '#4caf50',
            cancelled: '#9e9e9e'
        };
        
        const statusLabels = {
            pending: 'Remesa Enviada',
            delivered: 'Remesa Cobrada',
            cancelled: 'Cancelada'
        };
        
        const statusColor = statusColors[remesa.status] || '#616161';
        const statusLabel = statusLabels[remesa.status] || remesa.status;
        
        const createdDate = new Date(remesa.created_at).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const deliveredDate = remesa.delivered_at 
            ? new Date(remesa.delivered_at).toLocaleString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : null;
        
        return `
            <div class="order-card" style="border: 2px solid var(--gray-border); border-radius: 8px; padding: 24px; margin-bottom: 20px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <h3 style="margin: 0; color: var(--dark-blue-nav); font-size: 20px;">
                                Remesa #${remesa.confirmation_code}
                            </h3>
                            <span style="background: ${statusColor}; color: white; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 12px;">
                                ${statusLabel}
                            </span>
                        </div>
                        <p style="margin: 0; color: var(--gray-text); font-size: 14px;">
                            <i class="fas fa-calendar"></i> Enviada: ${createdDate}
                        </p>
                        ${deliveredDate ? `
                            <p style="margin: 4px 0 0 0; color: var(--gray-text); font-size: 14px;">
                                <i class="fas fa-check-circle"></i> Cobrada: ${deliveredDate}
                            </p>
                        ` : ''}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 6px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 13px; color: var(--gray-text); text-transform: uppercase;">
                            Destinatario
                        </h4>
                        <p style="margin: 0; font-weight: 600; color: var(--dark-blue-nav); font-size: 16px;">${remesa.recipient_name || 'N/A'}</p>
                        ${remesa.recipient_id ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: var(--gray-text);">CI: ${remesa.recipient_id}</p>` : ''}
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 6px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 13px; color: var(--gray-text); text-transform: uppercase;">
                            Cantidad a Entregar
                        </h4>
                        <p style="margin: 0; font-size: 20px; font-weight: 700; color: var(--dark-blue-nav);">
                            ${remesa.currency === 'USD' ? '$' : '₱'}${parseFloat(remesa.amount_usd).toFixed(2)} ${remesa.currency}
                        </p>
                        ${remesa.amount_cup ? `
                            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #4caf50;">
                                ${parseFloat(remesa.amount_cup).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CUP
                            </p>
                        ` : ''}
                    </div>
                </div>
                
                <div style="background: #f0f7ff; border-left: 4px solid #42b649; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="margin: 0; font-size: 13px; color: var(--gray-text);">
                                <i class="fas fa-key"></i> <strong>Código de Confirmación:</strong>
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 700; color: #42b649; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                                ${remesa.confirmation_code}
                            </p>
                        </div>
                        <button onclick="copyConfirmationCode('${remesa.confirmation_code}')" 
                                style="background: #42b649; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-copy"></i> Copiar Código
                        </button>
                    </div>
                    <p style="margin: 12px 0 0 0; font-size: 12px; color: #1f318a;">
                        <i class="fas fa-info-circle"></i> 
                        Proporciona este código al destinatario para que pueda recoger la remesa en la tienda.
                    </p>
                </div>
                
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 6px;">
                    <p style="margin: 0; font-size: 13px; color: #856404;">
                        <i class="fas fa-info-circle"></i> 
                        <strong>Total pagado:</strong> $${parseFloat(remesa.total_paid).toFixed(2)} USD 
                        (incluye comisión del 10%)
                    </p>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = remesasHtml;
}

function copyConfirmationCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        if (typeof showModal === 'function') {
            showModal('Código copiado', `El código ${code} ha sido copiado al portapapeles.`, 'success');
        } else {
            alert(`Código copiado: ${code}`);
        }
    }).catch(err => {
        console.error('Error copiando código:', err);
        if (typeof showModal === 'function') {
            showModal('Error', 'No se pudo copiar el código. Cópialo manualmente.', 'error');
        }
    });
}

// Exportar función globalmente
window.loadUserRemesas = loadUserRemesas;
window.copyConfirmationCode = copyConfirmationCode;
