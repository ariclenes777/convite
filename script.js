/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
// ========== VARIÁVEIS GLOBAIS ==========
let currentSlide = 0;
const slides = document.querySelectorAll(".slide");

// ========== CONFIGURAÇÃO IMPORTANTE ==========
// Substitua com SUA URL do Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxH57xbqSxIIYym3IL4MYK2MLmp0hHgKnrHGAVh6dgcGhtdE33DQUoBv8e7x748yUKO/exec";

// ========== FUNÇÃO PARA ENVIAR DADOS PARA GOOGLE SHEETS ==========
async function saveToGoogleSheets(data) {
    try {
        // Adicionar timestamp
        const submissionData = {
            ...data,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('pt-BR'),
            time: new Date().toLocaleTimeString('pt-BR')
        };

        console.log('Enviando para Google Sheets:', submissionData);
        
        // Usar o método simples para evitar problemas CORS
        const formData = new URLSearchParams();
        formData.append('name', data.name || '');
        formData.append('accompaniment', data.accompaniment || '');
        formData.append('guestType', data.guestType || '');
        formData.append('phone', data.phone || '');
        formData.append('date', submissionData.date);
        formData.append('timestamp', submissionData.timestamp);

        // Enviar para Google Apps Script
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Importante para Apps Script
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        console.log('Dados enviados (modo no-cors)');
        return { success: true };
        
    } catch (error) {
        console.error('Erro ao enviar para Google Sheets:', error);
        
        // Fallback: salvar localmente
        saveToLocalStorage(data);
        
        return { 
            success: false, 
            error: error.message,
            fallback: true
        };
    }
}

// Fallback: salvar no localStorage
function saveToLocalStorage(data) {
    try {
        let confirmations = JSON.parse(localStorage.getItem('weddingConfirmations')) || [];
        const confirmationWithId = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...data
        };
        confirmations.push(confirmationWithId);
        localStorage.setItem('weddingConfirmations', JSON.stringify(confirmations));
        console.log('Salvo no localStorage:', confirmationWithId);
        return true;
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        return false;
    }
}

// ========== FUNÇÃO PARA CONTAR CONFIRMAÇÕES ==========
async function fetchConfirmationCount() {
    try {
        // Primeiro tenta buscar do Google Sheets
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getCount&t=${Date.now()}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.total !== undefined) {
                document.getElementById('totalConfirmations').textContent = data.total;
                return;
            }
        }
    } catch (error) {
        console.log('Não foi possível buscar do Google Sheets');
    }
    
    // Fallback: usar localStorage
    try {
        const localConfirmations = JSON.parse(localStorage.getItem('weddingConfirmations')) || [];
        document.getElementById('totalConfirmations').textContent = localConfirmations.length;
    } catch (error) {
        console.log('Não foi possível carregar contador');
        document.getElementById('totalConfirmations').textContent = '0';
    }
}

// ========== FUNÇÃO PARA ADICIONAR AO CALENDÁRIO ==========
function addToCalendar() {
    // Dados do evento
    const eventData = {
        title: "Noivado Ginelma & Ariclenes",
        description: "Celebração do noivado de Ginelma e Ariclenes. Encontro das famílias às 14:00h e Celebração às 15:30h. Local: Quinta Kabezo, Kilamba, Luanda.",
        location: "Quinta Kabezo, Kilamba, Luanda, Angola",
        startDate: "2026-02-14T14:00:00",
        endDate: "2026-02-14T23:00:00",
        timeZone: "Africa/Luanda",
    };

    // Criar conteúdo .ics
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

    if (isIOS || isAndroid) {
        downloadICSFile(icsContent);
    } else {
        const useGoogleCalendar = confirm(
            "Como deseja adicionar ao calendário?\n\nClique em 'OK' para Google Calendar\nClique em 'Cancelar' para baixar arquivo .ics"
        );

        if (useGoogleCalendar) {
            const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title)}&dates=20260214T120000/20260214T230000&details=${encodeURIComponent(eventData.description)}&location=${encodeURIComponent(eventData.location)}&ctz=${eventData.timeZone}`;
            window.open(googleCalendarUrl, "_blank");
        } else {
            downloadICSFile(icsContent);
        }
    }
}

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
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").textContent = days;
    document.getElementById("hours").textContent = hours.toString().padStart(2, "0");
    document.getElementById("minutes").textContent = minutes.toString().padStart(2, "0");
    document.getElementById("seconds").textContent = seconds.toString().padStart(2, "0");
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
    document.body.style.overflow = "hidden";
    document.getElementById("errorMessage").style.display = "none";
    document.getElementById("successMessage").style.display = "none";
}

function closePopup() {
    document.getElementById("confirmationPopup").style.display = "none";
    document.body.style.overflow = "auto";
    resetForm();
}

function resetForm() {
    document.getElementById("confirmationForm").reset();
    hideAllErrors();
    document.getElementById("successMessage").style.display = "none";
    document.getElementById("errorMessage").style.display = "none";
    document.getElementById("submitButton").disabled = false;
    document.getElementById("submitButton").innerHTML = '<span class="whatsapp-icon">💬</span> Enviar Confirmação';
}

function hideAllErrors() {
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(error => {
        error.style.display = 'none';
    });
}

function validatePhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 9 && cleaned.length <= 15;
}

// ========== INICIALIZAÇÃO DO SCRIPT ==========
document.addEventListener("DOMContentLoaded", function() {
    console.log('DOM carregado - Iniciando configurações...');
    
    // Configurar imagens do slideshow
    try {
        document.getElementById("slide1").style.backgroundImage = "url('6.jpg')";
        document.getElementById("slide2").style.backgroundImage = "url('7.jpg')";
        document.getElementById("slide3").style.backgroundImage = "url('3.jpg')";
        console.log('Imagens do slideshow configuradas');
    } catch (error) {
        console.warn('Aviso: Não foi possível configurar todas as imagens do slideshow');
    }

    // Iniciar contagem regressiva
    updateCountdown();
    setInterval(updateCountdown, 1000);
    console.log('Contagem regressiva iniciada');

    // Iniciar slideshow
    if (slides.length > 0) {
        setInterval(nextSlide, 5000);
        console.log('Slideshow iniciado');
    }

    // Carregar contador de confirmações
    fetchConfirmationCount();
    console.log('Contador de confirmações carregado');

    // Adicionar event listeners
    const openButton = document.getElementById("openConfirmationButton");
    const closeButton = document.getElementById("closePopup");
    
    if (openButton) {
        openButton.addEventListener("click", openConfirmationPopup);
    }
    
    if (closeButton) {
        closeButton.addEventListener("click", closePopup);
    }

    // Fechar popup ao clicar fora
    const popup = document.getElementById("confirmationPopup");
    if (popup) {
        popup.addEventListener("click", function(e) {
            if (e.target === this) {
                closePopup();
            }
        });
    }

    // Fechar com ESC
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            closePopup();
        }
    });

    // Submissão do formulário
    const form = document.getElementById("confirmationForm");
    if (form) {
        form.addEventListener("submit", async function(e) {
            e.preventDefault();
            console.log('Formulário submetido');

            // Reset erros
            hideAllErrors();

            // Validação
            const name = document.getElementById("guestName").value.trim();
            const phone = document.getElementById("phoneNumber").value.trim();
            const guestType = document.getElementById("guestType").value;
            const accompaniment = document.getElementById("accompaniment").value.trim();

            let isValid = true;

            if (!name) {
                document.getElementById("nameError").style.display = "block";
                isValid = false;
            }

            if (!phone || !validatePhoneNumber(phone)) {
                document.getElementById("phoneError").style.display = "block";
                isValid = false;
            }

            if (!guestType) {
                document.getElementById("typeError").style.display = "block";
                isValid = false;
            }

            if (!isValid) {
                console.log('Formulário inválido');
                return;
            }

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

            message += `*Telefone:* ${phone}\n`;
            message += `*Convidado por:* ${guestType === "noiva" ? "Parte da Noiva (Ginelma)" : "Parte do Noivo (Ariclenes)"}\n\n`;
            message += `Aguardamos ansiosos pela sua presença! ❤️`;

            try {
                // Salvar localmente primeiro (sempre)
                saveToLocalStorage({
                    name: name,
                    accompaniment: accompaniment,
                    phone: phone,
                    guestType: guestType
                });

                // Tentar salvar no Google Sheets
                const saveResult = await saveToGoogleSheets({
                    name: name,
                    accompaniment: accompaniment,
                    phone: phone,
                    guestType: guestType
                });

                // Mostrar mensagem de sucesso
                document.getElementById("successMessage").style.display = "block";
                console.log('Processo de salvamento completo');

                // Aguardar 1.5 segundos antes de redirecionar
                setTimeout(() => {
                    // Determina o número do WhatsApp
                    let whatsappNumber;
                    if (guestType === "noiva") {
                        whatsappNumber = "244949804704";
                    } else {
                        whatsappNumber = "244932722512";
                    }

                    const encodedMessage = encodeURIComponent(message);
                    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
                    window.open(whatsappUrl, "_blank");

                    // Adicionar ao calendário
                    setTimeout(() => {
                        addToCalendar();
                    }, 500);

                    // Atualizar contador
                    fetchConfirmationCount();

                    // Fechar popup após 2 segundos
                    setTimeout(() => {
                        closePopup();
                    }, 2000);
                }, 1500);
                
            } catch (error) {
                console.error('Erro no processo:', error);
                
                // Mostrar mensagem de erro mas continuar
                document.getElementById("errorMessage").style.display = "block";
                document.getElementById("errorMessage").innerHTML = `
                    <p>⚠️ O sistema de salvamento encontrou um problema, mas você ainda pode enviar pelo WhatsApp.</p>
                    <p>Os dados foram salvos localmente.</p>
                `;
                
                // Aguardar 1 segundo e continuar com WhatsApp
                setTimeout(() => {
                    let whatsappNumber;
                    if (guestType === "noiva") {
                        whatsappNumber = "244949804704";
                    } else {
                        whatsappNumber = "244932722512";
                    }

                    const encodedMessage = encodeURIComponent(message);
                    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
                    window.open(whatsappUrl, "_blank");

                    setTimeout(() => {
                        addToCalendar();
                        fetchConfirmationCount();
                        closePopup();
                    }, 1000);
                }, 1000);
            }
        });
    }
    
    console.log('Inicialização completa');
});
