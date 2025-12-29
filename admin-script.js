/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
// ========== CONFIGURAÇÃO DO ADMIN ==========
const ADMIN_PASSWORD = "noivado2026"; // Senha padrão - MUDE ESTA SENHA!
const GOOGLE_SHEETS_CONFIG = {
    spreadsheetId: '1jpLK1Zq7PoQcBlCL7A-cu2CKwCjpGNphRnuF014oV5E', // MESMO ID DA PLANILHA
    apiKey: 'AIzaSyBOgCloWbkLOBgHM08TnjTjd72ywRrjpfc', // MESMA API KEY
    sheetName: 'Sheet1'
};

// ========== FUNÇÕES PARA LER DO GOOGLE SHEETS ==========
async function fetchConfirmationsFromSheets() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.sheetName}!A:F?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Erro ao buscar dados da planilha');
        }
        
        const data = await response.json();
        
        // Converter dados da planilha para formato interno
        if (!data.values || data.values.length <= 1) {
            return []; // Retorna vazio se só tiver cabeçalho ou nenhum dado
        }
        
        // Pular o cabeçalho (primeira linha)
        const rows = data.values.slice(1);
        
        return rows.map((row, index) => ({
            id: index + 1,
            timestamp: row[0] || '',
            name: row[1] || '',
            accompaniment: row[2] || '',
            guestType: row[3]?.includes('Noiva') ? 'noiva' : 'noivo',
            phone: row[4] || '',
            confirmationDate: row[5] || ''
        }));
    } catch (error) {
        console.error('Erro ao buscar do Google Sheets:', error);
        
        // Fallback: usar localStorage
        return getConfirmationsFromLocalStorage();
    }
}

// Fallback: dados do localStorage
function getConfirmationsFromLocalStorage() {
    return JSON.parse(localStorage.getItem('weddingConfirmations')) || [];
}

// ========== FUNÇÕES PARA O DASHBOARD ==========
async function getStatistics() {
    const confirmations = await fetchConfirmationsFromSheets();
    const total = confirmations.length;
    
    // Contar por tipo de convidado
    const countByType = confirmations.reduce((acc, conf) => {
        acc[conf.guestType] = (acc[conf.guestType] || 0) + 1;
        return acc;
    }, {});
    
    // Contar acompanhantes
    const withAccompaniment = confirmations.filter(conf => 
        conf.accompaniment && conf.accompaniment.trim() !== ''
    ).length;
    
    // Calcular estimativa total de pessoas
    let estimatedTotal = total;
    confirmations.forEach(conf => {
        if (conf.accompaniment && conf.accompaniment.trim() !== '') {
            // Se houver vírgulas, conta cada nome separado
            const accompaniments = conf.accompaniment.split(',').length;
            estimatedTotal += accompaniments;
        }
    });
    
    return {
        total,
        countByType,
        withAccompaniment,
        estimatedTotal,
        confirmations
    };
}

async function displayStatistics() {
    try {
        const stats = await getStatistics();
        const statsContainer = document.getElementById('dashboardStats');
        
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Total de Confirmações</h3>
                <div class="stat-number">${stats.total}</div>
            </div>
            <div class="stat-card">
                <h3>Parte da Noiva</h3>
                <div class="stat-number">${stats.countByType.noiva || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Parte do Noivo</h3>
                <div class="stat-number">${stats.countByType.noivo || 0}</div>
            </div>
            <div class="stat-card">
                <h3>Estimativa Total de Pessoas</h3>
                <div class="stat-number">${stats.estimatedTotal}</div>
                <small style="color: #666; font-size: 0.8rem;">(incluindo acompanhantes)</small>
            </div>
        `;
        
        // Atualizar lista de convidados
        await displayGuestList(stats.confirmations);
        
        // Atualizar timestamp
        document.getElementById('lastUpdate').textContent = 
            `Última atualização: ${new Date().toLocaleTimeString('pt-BR')}`;
        
    } catch (error) {
        console.error('Erro ao cargar estatísticas:', error);
        document.getElementById('dashboardStats').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <h3>Erro ao carregar dados</h3>
                <p>Verifique a conexão e tente novamente.</p>
                <button onclick="refreshDashboard()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

async function displayGuestList(guests) {
    const guestListContainer = document.getElementById('guestList');
    if (!guestListContainer) return;
    
    if (guests.length === 0) {
        guestListContainer.innerHTML = '<p class="empty-message">Nenhuma confirmação registrada ainda.</p>';
        return;
    }
    
    // Ordenar por data (mais recente primeiro)
    const sortedGuests = [...guests].sort((a, b) => 
        new Date(b.timestamp || b.id) - new Date(a.timestamp || a.id)
    );
    
    guestListContainer.innerHTML = `
        <div style="overflow-x: auto;">
            <table class="guest-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Acompanhante</th>
                        <th>Tipo</th>
                        <th>Data da Confirmação</th>
                        <th>Telefone</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedGuests.map(guest => `
                        <tr>
                            <td>${escapeHtml(guest.name)}</td>
                            <td>${escapeHtml(guest.accompaniment || '-')}</td>
                            <td><span class="guest-type ${guest.guestType}">${guest.guestType === 'noiva' ? 'Noiva' : 'Noivo'}</span></td>
                            <td>${formatDate(guest.timestamp || guest.confirmationDate)}</td>
                            <td>${escapeHtml(guest.phone || '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <p style="text-align: center; margin-top: 10px; color: #666; font-size: 0.9rem;">
            Total: ${guests.length} confirmações | Última: ${formatDate(sortedGuests[0]?.timestamp || '')}
        </p>
    `;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // Se não for uma data válida, retorna a string original
            return dateString;
        }
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
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
        const confirmations = await fetchConfirmationsFromSheets();
        
        if (confirmations.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }
        
        // Cabeçalhos do CSV
        const headers = ['Nome', 'Acompanhante', 'Tipo', 'Data da Confirmação', 'Telefone', 'Timestamp'];
        
        // Converter dados para linhas CSV
        const csvRows = [
            headers.join(','),
            ...confirmations.map(conf => [
                `"${conf.name}"`,
                `"${conf.accompaniment || ''}"`,
                `"${conf.guestType === 'noiva' ? 'Parte da Noiva' : 'Parte do Noivo'}"`,
                `"${formatDate(conf.confirmationDate)}"`,
                `"${conf.phone || ''}"`,
                `"${conf.timestamp}"`
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
        
    } catch (error) {
        console.error('Erro ao exportar:', error);
        alert('Erro ao exportar dados. Tente novamente.');
    }
}

function printDashboard() {
    // Abre uma nova janela com relatório formatado
    window.open('relatorio.html', '_blank');
}

// Criar arquivo relatorio.html separado para impressão
async function generateReport() {
    const stats = await getStatistics();
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório de Confirmações - Noivado Ginelma & Ariclenes</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
                .header { text-align: center; margin-bottom: 30px; }
                .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
                .stat-box { border: 1px solid #ddd; padding: 20px; text-align: center; border-radius: 8px; }
                .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
                table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #f5f5f5; }
                .footer { margin-top: 50px; text-align: center; color: #666; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Relatório de Confirmações</h1>
                <h2>Noivado Ginelma & Ariclenes</h2>
                <p>Data: 14 de Fevereiro de 2026</p>
                <p>Local: Quinta Kabezo, Kilamba, Luanda</p>
                <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
            
            <div class="stats">
                <div class="stat-box">
                    <div>Total de Confirmações</div>
                    <div class="stat-number">${stats.total}</div>
                </div>
                <div class="stat-box">
                    <div>Parte da Noiva</div>
                    <div class="stat-number">${stats.countByType.noiva || 0}</div>
                </div>
                <div class="stat-box">
                    <div>Parte do Noivo</div>
                    <div class="stat-number">${stats.countByType.noivo || 0}</div>
                </div>
                <div class="stat-box">
                    <div>Estimativa Total de Pessoas</div>
                    <div class="stat-number">${stats.estimatedTotal}</div>
                    <small>(incluindo acompanhantes)</small>
                </div>
            </div>
            
            <h3>Lista de Convidados Confirmados (${stats.total})</h3>
            ${stats.total > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Acompanhante</th>
                            <th>Tipo</th>
                            <th>Data da Confirmação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.confirmations.map(guest => `
                            <tr>
                                <td>${escapeHtml(guest.name)}</td>
                                <td>${escapeHtml(guest.accompaniment || '-')}</td>
                                <td>${guest.guestType === 'noiva' ? 'Parte da Noiva' : 'Parte do Noivo'}</td>
                                <td>${formatDate(guest.timestamp)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p>Nenhuma confirmação registrada.</p>'}
            
            <div class="footer">
                <p>Com amor, Ginelma & Ariclenes © ${new Date().getFullYear()}</p>
                <p>Relatório gerado automaticamente pelo sistema de confirmações</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function clearAllData() {
    alert('Para limpar os dados, acesse diretamente sua planilha do Google Sheets.\n\nEsta funcionalidade não está disponível para dados remotos.');
}

async function refreshDashboard() {
    const refreshBtn = document.querySelector('.control-button.success');
    const originalText = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = '<span>⏳</span> Atualizando...';
    refreshBtn.disabled = true;
    
    try {
        await displayStatistics();
        alert('Dashboard atualizado com sucesso!');
    } catch (error) {
        alert('Erro ao atualizar. Verifique sua conexão.');
    } finally {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
    }
}

function logout() {
    if (confirm('Deseja sair do dashboard?')) {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = 'admin.html';
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
        displayStatistics();
        
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
        displayStatistics();
    }
});