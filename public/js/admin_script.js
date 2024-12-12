
document.addEventListener("DOMContentLoaded", () => {
  const dropdownButton = document.getElementById("dropdownActionButton");
  const dropdownMenu = document.getElementById("dropdownRadioBgHover");

  dropdownButton.addEventListener("click", () => {
    dropdownMenu.classList.toggle("hidden"); // Toggle the "hidden" class
  });

  // Optional: Close the dropdown when clicking outside
  document.addEventListener("click", (event) => {
    if (!dropdownButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
      dropdownMenu.classList.add("hidden");
    }
  });
});


function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.autoTable({ html: '#userTable' });
    doc.save('User.pdf');
  }
  
