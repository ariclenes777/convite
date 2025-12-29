/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
const GOOGLE_SHEETS_CONFIG = {
    spreadsheetId: '1jpLK1Zq7PoQcBlCL7A-cu2CKwCjpGNphRnuF014oV5E', // ID da sua planilha
    apiKey: 'AIzaSyBOgCloWbkLOBgHM08TnjTjd72ywRrjpfc', // Sua chave de API do Google
    sheetName: 'Sheet1' // Nome da aba (geralmente "Página1")
};
// ========== VARIÁVEIS GLOBAIS ==========
let currentSlide = 0;
const slides = document.querySelectorAll(".slide");
// ========== FUNÇÃO PARA ENVIAR DADOS PARA GOOGLE SHEETS ==========
async function saveToGoogleSheets(data) {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.sheetName}!A:F:append?valueInputOption=USER_ENTERED&key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
        
        const timestamp = new Date().toISOString();
        const rowData = [
            timestamp,
            data.name,
            data.accompaniment || '',
            data.guestType === 'noiva' ? 'Parte da Noiva' : 'Parte do Noivo',
            '', // Telefone (opcional)
            new Date().toLocaleDateString('pt-BR')
        ];
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: [rowData]
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao salvar na planilha');
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar no Google Sheets:', error);
        
        // Fallback: salvar no localStorage também
        saveToLocalStorage(data);
        
        return false;
    }
}

// Fallback: salvar no localStorage
function saveToLocalStorage(data) {
    let confirmations = JSON.parse(localStorage.getItem('weddingConfirmations')) || [];
    const confirmationWithId = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...data
    };
    confirmations.push(confirmationWithId);
    localStorage.setItem('weddingConfirmations', JSON.stringify(confirmations));
}

// ========== FUNÇÃO PARA ADICIONAR AO CALENDÁRIO ==========
function addToCalendar() {
    // Dados do evento
    const eventData = {
        title: "Noivado Ginelma & Ariclenes",
        description: "Celebração do noivado de Ginelma e Ariclenes. Encontro das famílias às 14:00h e Celebração às 15:30h. Local: Quinta Kabezo, Kilamba, Luanda.",
        location: "Quinta Kabezo, Kilamba, Luanda, Angola",
        startDate: "2026-02-14T14:00:00", // 14 de fevereiro de 2026 às 14:00
        endDate: "2026-02-14T23:00:00", // Até às 23:00
        timeZone: "Africa/Luanda",
    };

    // Criar conteúdo .ics (padrão universal para calendários)
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Noivado Ginelma & Ariclenes//PT
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${Date.now()}@noivadoginelmaariclenes.ao
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:20260214T140000
DTEND:20260214T230000
SUMMARY:${eventData.title}
DESCRIPTION:${eventData.description}
LOCATION:${eventData.location}
STATUS:CONFIRMED
TRANSP:OPAQUE
BEGIN:VALARM
TRIGGER:-PT24H
ACTION:DISPLAY
DESCRIPTION:Lembrete: Noivado amanhã!
END:VALARM
END:VEVENT
END:VCALENDAR`;

    // Detectar dispositivo
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    // Para iOS - usa o protocolo webcal
    if (isIOS) {
        const webcalUrl = `webcal://p41-calendars.icloud.com/published/2/${encodeURIComponent(icsContent)}`;
        window.location.href = webcalUrl;
        setTimeout(() => {
            // Fallback para download .ics se webcal não funcionar
            downloadICSFile(icsContent);
        }, 1000);
    }
    // Para Android - tenta abrir Google Calendar
    else if (isAndroid) {
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title)}&dates=20260214T120000/20260214T230000&details=${encodeURIComponent(eventData.description)}&location=${encodeURIComponent(eventData.location)}&ctz=${eventData.timeZone}`;

        window.open(googleCalendarUrl, "_blank");
        setTimeout(() => {
            // Se popup foi bloqueado, oferece download
            if (!window.open) {
                downloadICSFile(icsContent);
            }
        }, 500);
    }
    // Para desktop ou outros dispositivos
    else {
        // Mostra opções para o usuário
        const useGoogleCalendar = confirm(
            "Como deseja adicionar ao calendário?\n\nClique em 'OK' para Google Calendar\nClique em 'Cancelar' para baixar arquivo .ics (funciona com Outlook, Apple Calendar, etc.)"
        );

        if (useGoogleCalendar) {
            const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title)}&dates=20260214T120000/20260214T230000&details=${encodeURIComponent(eventData.description)}&location=${encodeURIComponent(eventData.location)}&ctz=${eventData.timeZone}`;
            window.open(googleCalendarUrl, "_blank");
        } else {
            downloadICSFile(icsContent);
        }
    }
}

// Função para baixar arquivo .ics
function downloadICSFile(icsContent) {
    const blob = new Blob([icsContent], {
        type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "Noivado-Ginelma-Ariclenes.ics";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Mostra mensagem de ajuda
    setTimeout(() => {
        alert(
            "Arquivo baixado! Para adicionar ao seu calendário:\n\n1. Abra o arquivo .ics baixado\n2. Seu aplicativo de calendário abrirá automaticamente\n3. Confirme para adicionar o evento"
        );
    }, 500);
}

// ========== FUNÇÃO DE CONTAGEM REGRESSIVA ==========
function updateCountdown() {
    const eventDate = new Date("2026-02-14T00:00:00").getTime();
    const now = new Date().getTime();
    const distance = eventDate - now;

    if (distance < 0) {
        document.getElementById("days").textContent = "0";
        document.getElementById("hours").textContent = "0";
        document.getElementById("minutes").textContent = "0";
        document.getElementById("seconds").textContent = "0";
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").textContent = days;
    document.getElementById("hours").textContent = hours
        .toString()
        .padStart(2, "0");
    document.getElementById("minutes").textContent = minutes
        .toString()
        .padStart(2, "0");
    document.getElementById("seconds").textContent = seconds
        .toString()
        .padStart(2, "0");
}

// ========== SLIDESHOW ==========
function nextSlide() {
    slides[currentSlide].classList.remove("active");
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add("active");
}

// ========== FUNÇÕES DO POPUP DE CONFIRMAÇÃO ==========
function openConfirmationPopup() {
    document.getElementById("confirmationPopup").style.display = "flex";
    document.body.style.overflow = "hidden"; // Previne scroll da página
}

function closePopup() {
    document.getElementById("confirmationPopup").style.display = "none";
    document.body.style.overflow = "auto"; // Restaura scroll da página
    resetForm();
}

function resetForm() {
    document.getElementById("confirmationForm").reset();
    hideAllErrors();
    document.getElementById("successMessage").style.display = "none";
    document.getElementById("submitButton").disabled = false;
    document.getElementById("submitButton").innerHTML =
        '<span class="whatsapp-icon">💬</span> Enviar Confirmação';
}

function hideAllErrors() {
    document.getElementById("nameError").style.display = "none";
    document.getElementById("typeError").style.display = "none";
}

// ========== FUNÇÕES PARA SALVAR CONFIRMAÇÕES ==========
function saveConfirmation(data) {
    // Recupera confirmações existentes ou cria array vazio
    let confirmations = JSON.parse(localStorage.getItem('weddingConfirmations')) || [];
    
    // Adiciona nova confirmação com timestamp
    const confirmationWithId = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...data
    };
    
    confirmations.push(confirmationWithId);
    
    // Salva no LocalStorage
    localStorage.setItem('weddingConfirmations', JSON.stringify(confirmations));
    
    return true;
}

// Funções auxiliares para formatar dados
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ========== INICIALIZAÇÃO DO SCRIPT ==========
document.addEventListener("DOMContentLoaded", function() {
    // Configurar imagens do slideshow
    document.getElementById("slide1").style.backgroundImage = "url('6.jpg')";
    document.getElementById("slide2").style.backgroundImage = "url('7.jpg')";
    document.getElementById("slide3").style.backgroundImage = "url('3.jpg')";

    // Iniciar contagem regressiva
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // Iniciar slideshow
    setInterval(nextSlide, 5000);

    // Adicionar event listeners
    document.getElementById("openConfirmationButton").addEventListener("click", openConfirmationPopup);
    document.getElementById("closePopup").addEventListener("click", closePopup);

    // Fechar popup ao clicar fora
    document.getElementById("confirmationPopup").addEventListener("click", function(e) {
        if (e.target === this) {
            closePopup();
        }
    });

    // Fechar com ESC
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            closePopup();
        }
    });

    // Submissão do formulário
    document.getElementById("confirmationForm").addEventListener("submit", function(e) {
        e.preventDefault();

        // Reset erros
        hideAllErrors();

        // Validação
        const name = document.getElementById("guestName").value.trim();
        const guestType = document.getElementById("guestType").value;
        const accompaniment = document.getElementById("accompaniment").value.trim();

        let isValid = true;

        if (!name) {
            document.getElementById("nameError").style.display = "block";
            isValid = false;
        }

        if (!guestType) {
            document.getElementById("typeError").style.display = "block";
            isValid = false;
        }

        if (!isValid) return;

        // Desabilita o botão de enviar
        const submitButton = document.getElementById("submitButton");
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="whatsapp-icon">⏳</span> Enviando...';

        // Monta a mensagem para o WhatsApp
        let message = `Olá! Gostaria de confirmar minha presença no noivado de Ginelma & Ariclenes no dia 14 de fevereiro de 2026.\n\n`;
        message += `*Nome:* ${name}\n`;

        if (accompaniment) {
            message += `*Acompanhante(s):* ${accompaniment}\n`;
        }

        message += `*Convidado por:* ${guestType === "noiva" ? "Parte da Noiva (Ginelma)" : "Parte do Noivo (Ariclenes)"}\n\n`;
        message += `Aguardamos ansiosos pela sua presença! ❤️`;

        // Mostra mensagem de sucesso
        document.getElementById("successMessage").style.display = "block";

        // Determina o número do WhatsApp baseado na escolha
        let whatsappNumber;
        if (guestType === "noiva") {
            whatsappNumber = "244949804704"; // Noiva
        } else {
            whatsappNumber = "244932722512"; // Noivo
        }

        // Aguarda 2 segundos antes de redirecionar
        setTimeout(() => {
            // Salvar no LocalStorage para o dashboard
            saveConfirmation({
                name: name,
                accompaniment: accompaniment,
                guestType: guestType
            });
            
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
            window.open(whatsappUrl, "_blank");

            // ADICIONA AO CALENDÁRIO APÓS CONFIRMAÇÃO
            setTimeout(() => {
                addToCalendar();
            }, 1000);

            closePopup();
        }, 2000);
    });
});