// Variables globales para almacenar los contactos
let allContacts = [];
let filteredContacts = [];
let currentFilter = 'all';
let currentLadaFilter = 'all';

// Función para extraer la lada de un número
function extractLada(remoteJid) {
  if (!remoteJid) return '';
  
  // Extraer el número del JID (eliminar @s.whatsapp.net)
  const numberPart = remoteJid.split('@')[0];
  
  // Identificar números mexicanos (código de país 52)
  if (numberPart.startsWith('52')) {
    // Número mexicano: +52XXXXXXXXXX
    const fullNumber = numberPart.substring(2); // Quitar el 52
    
    // Determinar la lada basada en la longitud
    if (fullNumber.length >= 10) {
      // Números con lada de 2 dígitos (ej. 55, 33, 81)
      if (fullNumber.startsWith('1') || fullNumber.startsWith('55') || 
          fullNumber.startsWith('33') || fullNumber.startsWith('81')) {
        return '52-' + fullNumber.substring(0, 2);
      }
      // Números con lada de 3 dígitos (ej. 222, 229, 461, 477, 449, 664)
      else if (fullNumber.startsWith('222') || fullNumber.startsWith('229') || 
              fullNumber.startsWith('461') || fullNumber.startsWith('477') || 
              fullNumber.startsWith('449') || fullNumber.startsWith('664') ||
              fullNumber.startsWith('981')){
        return '52-' + fullNumber.substring(0, 3);
      }
    }
    
    return '52'; // Solo código de país si no se identifica lada específica
  }
  
  // Identificar otros países
  if (numberPart.startsWith('1')) return '1'; // USA/Canada
  if (numberPart.startsWith('34')) return '34'; // España
  if (numberPart.startsWith('54')) return '54'; // Argentina
  if (numberPart.startsWith('55')) return '55'; // Brasil
  if (numberPart.startsWith('56')) return '56'; // Chile
  if (numberPart.startsWith('57')) return '57'; // Colombia
  if (numberPart.startsWith('58')) return '58'; // Venezuela
  
  // Para otros países, devolver los primeros 2-3 dígitos
  if (numberPart.length > 3) {
    return numberPart.substring(0, 3);
  }
  
  return numberPart;
}

async function findContacts() {
  const container = document.getElementById("contacts");
  container.innerHTML = `
    <div class="loading">
      <i class="fas fa-circle-notch fa-spin"></i>
      <h3>Cargando contactos</h3>
      <p>Estamos obteniendo y organizando su información de contacto</p>
    </div>
  `;

  try {
     
     const response = await fetch("http://127.0.0.1:8000/api/find-contacts", {
       method: "POST",
       headers: {
         "Content-Type": "application/json"
       },
       body: JSON.stringify({})
     });
     const data = await response.json();
    

    // Si hay contactos
    if (Array.isArray(data) && data.length > 0) {
      allContacts = data;
      filteredContacts = [...allContacts];
      renderContacts();
    } else {
      showEmptyState();
    }

  } catch (error) {
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error de conexión</h3>
        <p>No se pudo conectar con el servidor: ${error}</p>
      </div>
    `;
    document.getElementById("count").textContent = "Error";
  }
}

function renderContacts() {
  const container = document.getElementById("contacts");
  const countElement = document.getElementById("count");
  
  if (filteredContacts.length > 0) {
    countElement.textContent = `${filteredContacts.length} de ${allContacts.length} contactos`;
    
    container.innerHTML = "";
    filteredContacts.forEach(contact => {
      const name = contact.pushName || "Sin nombre";
      const jid = contact.remoteJid || "";
      const number = jid.split("@")[0] || "N/A";
      const pic = contact.profilePicUrl;
      const initials = name.charAt(0).toUpperCase() || "?";
      const lada = extractLada(jid);
      
      // Determinar si es contacto o grupo
      const isGroup = jid.includes("g.us");
      const type = isGroup ? "group" : "contact";
      const typeText = isGroup ? "Grupo" : "Contacto";
      
      const card = document.createElement("div");
      card.className = `contact-card ${type}`;
      
      // Avatar con imagen o iniciales
      const avatar = document.createElement("div");
      if (pic) {
        avatar.style.backgroundImage = `url(${pic})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
      } else {
        avatar.textContent = initials;
      }
      avatar.className = `avatar ${type}`;
      
      // Badge para indicar tipo
      const badge = document.createElement("div");
      badge.className = `badge ${type}`;
      badge.innerHTML = isGroup ? '<i class="fas fa-users"></i>' : '<i class="fas fa-user"></i>';
      avatar.appendChild(badge);
      
      card.appendChild(avatar);
      
      // Información de contacto
      const info = document.createElement("div");
      info.className = "contact-info";
      
      // Mostrar lada si está disponible
      const ladaBadge = lada ? `<span class="contact-lada">+${lada}</span>` : '';
      
      info.innerHTML = `
        <div>
          <span class="contact-type type-${type}">${typeText}</span>
          ${ladaBadge}
        </div>
        <h3 class="contact-name">${name}</h3>
        <p class="contact-number">+${number}</p>
      `;
      card.appendChild(info);
      
      // Acciones
      const actions = document.createElement("div");
      actions.className = "contact-actions";
      actions.innerHTML = `
        <button class="action-btn">
          <i class="fas fa-ellipsis-v"></i>
        </button>
      `;
      card.appendChild(actions);
      
      container.appendChild(card);
    });
  } else {
    showEmptyState();
  }
}

function showEmptyState() {
  const container = document.getElementById("contacts");
  const countElement = document.getElementById("count");
  
  if (allContacts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-user-slash"></i>
        <h3>No se encontraron contactos</h3>
        <p>Intente sincronizar nuevamente o verifique su conexión</p>
      </div>
    `;
    countElement.textContent = "0 contactos";
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-filter"></i>
        <h3>No hay contactos con este filtro</h3>
        <p>Intente con otro filtro o limpie los filtros actuales</p>
      </div>
    `;
    countElement.textContent = `0 de ${allContacts.length} contactos`;
  }
}

function filterContacts(type) {
  currentFilter = type;
  
  // Actualizar botones de filtro
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.filter-btn[onclick="filterContacts('${type}')"]`).classList.add('active');
  
  // Aplicar filtro
  applyFilters();
}

function filterByLada() {
  const ladaSelect = document.getElementById('lada-filter');
  currentLadaFilter = ladaSelect.value;
  
  // Aplicar filtro
  applyFilters();
}

function applyFilters() {
  // Primero aplicar filtro de tipo (contacto/grupo)
  if (currentFilter === 'all') {
    filteredContacts = [...allContacts];
  } else if (currentFilter === 'contact') {
    filteredContacts = allContacts.filter(contact => 
      contact.remoteJid && contact.remoteJid.includes("@s.whatsapp.net")
    );
  } else if (currentFilter === 'group') {
    filteredContacts = allContacts.filter(contact => 
      contact.remoteJid && contact.remoteJid.includes("@g.us")
    );
  }
  
  // Luego aplicar filtro de lada
  if (currentLadaFilter !== 'all') {
    filteredContacts = filteredContacts.filter(contact => {
      const lada = extractLada(contact.remoteJid);
      
      if (currentLadaFilter === 'mexico') {
        return lada.startsWith('52');
      } else if (currentLadaFilter === 'international') {
        return !lada.startsWith('52');
      } else {
        return lada === currentLadaFilter;
      }
    });
  }
  
  renderContacts();
}

function clearFilters() {
  // Restablecer filtros
  currentFilter = 'all';
  currentLadaFilter = 'all';
  
  // Actualizar UI
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.filter-btn[onclick="filterContacts('all')"]`).classList.add('active');
  
  document.getElementById('lada-filter').value = 'all';
  
  // Aplicar filtros
  applyFilters();
}

function toggleRawData() {
  const rawContent = document.getElementById("raw-content");
  const toggleText = document.getElementById("toggle-text");
  
  if (rawContent.classList.contains("show")) {
    rawContent.classList.remove("show");
    toggleText.textContent = "Mostrar JSON";
  } else {
    rawContent.classList.add("show");
    toggleText.textContent = "Ocultar JSON";
  }
}

// Inicializar vista
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("contacts").innerHTML = `
    <div class="empty-state">
      <i class="fas fa-address-book"></i>
      <h3>Lista de contactos vacía</h3>
      <p>Haga clic en "Sincronizar Contactos" para comenzar</p>
    </div>
  `;
});