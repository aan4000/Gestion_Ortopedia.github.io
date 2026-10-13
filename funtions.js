// PROGRAMAR CITAS

const form = document.getElementById('form');
const btnCitas = document.getElementById('button');

form.addEventListener('submit', function(event) {
  event.preventDefault();

  // Validación correcta
  const name = document.getElementById('name').value.trim();
  const date = document.getElementById('date').value.trim();
  const time = document.getElementById('time').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!name || !date || !time || !email || !message) {
    alert("Debes completar toda tu información ⚠");
    return;
  }else{

    // limpiar los campos
  const name = document.getElementById('name').value = "";
  const date = document.getElementById('date').value = "";
  const time = document.getElementById('time').value = "";
  const email = document.getElementById('email').value = "";
  const message = document.getElementById('message').value = "";







  }

  btnCitas.value = 'Enviando...';

  const serviceID = 'default_service';
  const templateID = 'template_f46xj6n';

  emailjs.sendForm(serviceID, templateID, this)
    .then(() => {
      btnCitas.value = 'Agendar Cita';
      alert('¡Enviado!');
    })
    .catch((err) => {
      btnCitas.value = 'Agendar Cita';
      alert(JSON.stringify(err));
    });
});
