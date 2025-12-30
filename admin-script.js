/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
// ========== CONFIGURAÇÃO DO ADMIN ==========
const ADMIN_PASSWORD = "noivado2026"; // Senha padrão - MUDE ESTA SENHA!

// ========== CONFIGURAÇÃO DO GOOGLE SHEETS ==========
// COLE SUA URL DO GOOGLE APPS SCRIPT AQUI (MESMA DO script.js):
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxH57xbqSxIIYym3IL4MYK2MLmp0hHgKnrHGAVh6dgcGhtdE33DQUoBv8e7x748yUKO/exec";


// ========== FUNÇÕES PARA O DASHBOARD ==========
async function fetchDataFromGoogleSheets() {
    try {
        showLoading(true);
        
        // Adicionar timestamp para evitar cache
        const url = `${GOOGLE_SCRIPT_URL}?t=${Date.now()}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Erro ao carregar dados');
        }
        
        return data.data || [];
        
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const loadingElement = document.getElementById('loadingData');
    const contentElement = document.getElementById('dashboardContent');
    
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
    
    if (contentElement) {
        contentElement.style.display = show ? 'none' : 'block';
    }
}

function getStatistics(confirmations) {
    const total = confirmations.length;
    
    // Contar por tipo de convidado
    const countByType = confirmations.reduce((acc, conf) => {
        const type = conf.Tipo || conf.guestType || '';
        if (type) {
            acc[type] = (acc[type] || 0) + 1;
        }
        return acc;
    }, {});
    
    // Contar acompanhantes
    const withAccompaniment = confirmations.filter(conf => {
        const acc = conf.Acompanhante || conf.accompaniment || '';
        return acc && acc.trim() !== '' && acc.trim() !== '-';
    }).length;
    
    // Calcular estimativa total de pessoas
    let estimatedTotal = total;
    confirmations.forEach(conf => {
        const acc = conf.Acompanhante || conf.accompaniment || '';
        if (acc && acc.trim() !== '' && acc.trim() !== '-') {
            // Se houver vírgulas, conta cada nome separado
            const accompaniments = acc.split(',').length;
            estimatedTotal += accompaniments;
        }
    });
    
    // Contar por data (últimos 7 dias)
    const last7Days = confirmations.filter(conf => {
        const dateStr = conf.Data || conf.timestamp || '';
        if (!dateStr) return false;
        
        const confDate = new Date(dateStr);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        return confDate >= sevenDaysAgo;
    }).length;
    
    return {
        total,
        countByType,
        withAccompaniment,
        estimatedTotal,
        last7Days,
        confirmations
    };
}

function displayStatistics(confirmations) {
    const stats = getStatistics(confirmations);
    const statsContainer = document.getElementById('dashboardStats');
    
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3>Total de Confirmações</h3>
            <div class="stat-number">${stats.total}</div>
            <small style="color: #666; font-size: 0.8rem;">registros</small>
        </div>
        <div class="stat-card">
            <h3>Parte da Noiva</h3>
            <div class="stat-number">${stats.countByType.noiva || 0}</div>
            <small style="color: #666; font-size: 0.8rem;">convidados</small>
        </div>
        <div class="stat-card">
            <h3>Parte do Noivo</h3>
            <div class="stat-number">${stats.countByType.noivo || 0}</div>
            <small style="color: #666; font-size: 0.8rem;">convidados</small>
        </div>
        <div class="stat-card">
            <h3>Estimativa Total</h3>
            <div class="stat-number">${stats.estimatedTotal}</div>
            <small style="color: #666; font-size: 0.8rem;">pessoas (com acompanhantes)</small>
        </div>
        <div class="stat-card">
            <h3>Últimos 7 Dias</h3>
            <div class="stat-number">${stats.last7Days}</div>
            <small style="color: #666; font-size: 0.8rem;">novas confirmações</small>
        </div>
        <div class="stat-card">
            <h3>Com Acompanhante</h3>
            <div class="stat-number">${stats.withAccompaniment}</div>
            <small style="color: #666; font-size: 0.8rem;">confirmações</small>
        </div>
    `;
    
    // Atualizar lista de convidados
    displayGuestList(stats.confirmations);
    
    // Atualizar timestamp
    document.getElementById('lastUpdate').textContent = `Última atualização: ${new Date().toLocaleTimeString('pt-BR')}`;
}

function displayGuestList(guests) {
    const guestListContainer = document.getElementById('guestList');
    if (!guestListContainer) return;
    
    if (!guests || guests.length === 0) {
        guestListContainer.innerHTML = '<p class="empty-message">Nenhuma confirmação registrada ainda.</p>';
        return;
    }
    
    // Ordenar por data (mais recente primeiro)
    const sortedGuests = [...guests].sort((a, b) => {
        const dateA = new Date(a.Data || a.timestamp || 0);
        const dateB = new Date(b.Data || b.timestamp || 0);
        return dateB - dateA;
    });
    
    guestListContainer.innerHTML = `
        <div style="overflow-x: auto;">
            <table class="guest-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Acompanhante</th>
                        <th>Telefone</th>
                        <th>Tipo</th>
                        <th>Data da Confirmação</th>
                        <th>WhatsApp</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedGuests.map(guest => `
                        <tr>
                            <td>${escapeHtml(guest.Nome || guest.name || '')}</td>
                            <td>${escapeHtml(guest.Acompanhante || guest.accompaniment || '-')}</td>
                            <td>${escapeHtml(guest.Telefone || guest.phone || '-')}</td>
                            <td>
                                <span class="guest-type ${(guest.Tipo || guest.guestType || '').toLowerCase()}">
                                    ${(guest.Tipo || guest.guestType || '').toLowerCase() === 'noiva' ? 'Noiva' : 
                                      (guest.Tipo || guest.guestType || '').toLowerCase() === 'noivo' ? 'Noivo' : 'Não especificado'}
                                </span>
                            </td>
                            <td>${formatDate(guest.Data || guest.timestamp)}</td>
                            <td>${guest.WhatsAppEnviado || 'SIM'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <p style="text-align: center; margin-top: 10px; color: #666; font-size: 0.9rem;">
            Total: ${guests.length} confirmações | Mostrando ${Math.min(guests.length, 100)} mais recentes
        </p>
    `;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        
        // Verificar se a data é válida
        if (isNaN(date.getTime())) {
            // Tentar parsear formato brasileiro
            const brDate = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (brDate) {
                const [_, day, month, year] = brDate;
                const newDate = new Date(year, month - 1, day);
                if (!isNaN(newDate.getTime())) {
                    return newDate.toLocaleDateString('pt-BR');
                }
            }
            return dateString;
        }
        
        return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function exportToCSV() {
    try {
        showLoading(true);
        const confirmations = await fetchDataFromGoogleSheets();
        
        if (confirmations.length === 0) {
            alert('Não há dados para exportar.');
            showLoading(false);
            return;
        }
        
        // Cabeçalhos do CSV
        const headers = ['Data', 'Nome', 'Acompanhante', 'Telefone', 'Tipo', 'WhatsApp Enviado', 'Timestamp'];
        
        // Converter dados para linhas CSV
        const csvRows = [
            headers.join(','),
            ...confirmations.map(conf => [
                `"${conf.Data || ''}"`,
                `"${conf.Nome || conf.name || ''}"`,
                `"${conf.Acompanhante || conf.accompaniment || ''}"`,
                `"${conf.Telefone || conf.phone || ''}"`,
                `"${conf.Tipo || conf.guestType || ''}"`,
                `"${conf.WhatsAppEnviado || 'SIM'}"`,
                `"${conf.Timestamp || conf.timestamp || ''}"`
            ].join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        
        // Criar blob e download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `confirmacoes-noivado-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`CSV exportado com sucesso! Total: ${confirmations.length} registros.`);
        
    } catch (error) {
        alert('Erro ao exportar CSV: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function printDashboard() {
    window.print();
}

async function refreshDashboard() {
    try {
        const confirmations = await fetchDataFromGoogleSheets();
        displayStatistics(confirmations);
        alert(`Dashboard atualizado! Total: ${confirmations.length} confirmações.`);
    } catch (error) {
        alert('Erro ao atualizar: ' + error.message);
    }
}

// ========== FUNÇÕES DE LOGIN ==========
function checkPassword() {
    const password = document.getElementById('adminPassword').value;
    const errorElement = document.getElementById('loginError');
    
    if (password === ADMIN_PASSWORD) {
        // Login bem-sucedido
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'block';
        
        // Carregar dados do Google Sheets
        refreshDashboard();
        
        // Limpar campo de senha
        document.getElementById('adminPassword').value = '';
        errorElement.style.display = 'none';
    } else {
        // Login falhou
        errorElement.style.display = 'block';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

function logout() {
    if (confirm('Deseja sair do dashboard?')) {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = 'admin.html';
    }
}

// ========== INICIALIZAÇÃO DO ADMIN ==========
document.addEventListener('DOMContentLoaded', function() {
    // Event listener para o formulário de login
    document.getElementById('loginForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        checkPassword();
    });
    
    // Permitir login com Enter
    document.getElementById('adminPassword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkPassword();
        }
    });
    
    // Focar no campo de senha ao carregar
    document.getElementById('adminPassword')?.focus();
    
    // Verificar se já está logado
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'block';
        refreshDashboard();
    }
});
