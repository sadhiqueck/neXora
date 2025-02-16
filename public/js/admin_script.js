

// spinner

function showSpinner() {
  document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideSpinner() {
  document.getElementById('loadingSpinner').classList.add('hidden');
}

// global Notyf instance
const notyf = new Notyf({
  duration: 2000,
  position: { x: 'right', y: 'top' }
});

// Add custom styles for Notyf
const style = document.createElement('style');
style.innerHTML = `
.notyf__toast {
  border-radius: 8px; 
  margin-bottom: 10px; 
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
}
`;
document.head.appendChild(style);


// offline bannner
document.addEventListener('DOMContentLoaded', function() {
  const banner = document.getElementById('offlineBanner');
  const closeButton = document.getElementById('closeBanner');
  let isOffline = false;

  function showBanner() {
    banner.classList.remove('hidden', '-translate-y-full');
    banner.classList.add('translate-y-0');
  }

  function hideBanner() {
    banner.classList.add('-translate-y-full');
    setTimeout(() => {
      banner.classList.add('hidden');
    }, 300);
  }

  // Check online/offline status
  window.addEventListener('online', function() {
    isOffline = false;
    hideBanner();
  });

  window.addEventListener('offline', function() {
    isOffline = true;
    showBanner();
  });

  // Close button handler
  closeButton.addEventListener('click', function() {
    hideBanner();
  });

  // Initial check
  if (!navigator.onLine) {
    isOffline = true;
    showBanner();
  }
});


document.addEventListener("DOMContentLoaded", () => {

  // script for login page

  if (document.body.id === 'login-page') {
    const form = document.querySelector('form');
    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#password");
    const mssg = document.querySelector("#mssg");
    const urlParams = new URLSearchParams(window.location.search);
    const sccsmsg = urlParams.get('mssg');
    console.log(sccsmsg);
     

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const passwordRegex = /^.{6,}$/;

    form.addEventListener('submit', (e) => {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (email === "" || password === "") {
        mssg.textContent = "Fields cannot be blank!";
        e.preventDefault();
      } else if (!emailRegex.test(email)) {
        mssg.textContent = "Enter a valid email!";
        e.preventDefault();
      } else if (!passwordRegex.test(password)) {
        mssg.textContent = "Password must include at least 6 characters.";
        e.preventDefault();
      } else {
        mssg.textContent = "";
        
      }
    });

    if (sccsmsg) {
      const messageElement = document.getElementById('mssg'); 
      messageElement.textContent = sccsmsg; 
      messageElement.style.color = 'green'; 
    }
  }


  if (document.body.id === 'product_manage' ||
    document.body.id === 'dashboard' ||
    document.body.id === 'category_manage' ||
    document.body.id === 'user_manage') {
  


    function exportPDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.autoTable({ html: '#userTable' });
      doc.save('User.pdf');
    }
    
    const logoutButton = document.getElementById("logoutButton"); 
    const logoutForm = document.getElementById("logout-form");
  
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault(); 
      logoutForm.submit(); 
    });
  }



});