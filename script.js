const respNav = document.getElementById("respNav");
const respMenu = document.getElementById("resMenu")

// respNav.style.display = "none"

respMenu.addEventListener("click",()=>{

    respNav.classList.toggle("showMe")

})












const reset = document.getElementById("reset").addEventListener("click",()=>{

   const confirmacion =  confirm( "quieres borrar este contenido?");

 

});

// FORMULARIO DE CONTACTO
const btn = document.getElementById('button');

document.getElementById('form')
 .addEventListener('submit', function(event) {
   event.preventDefault();

   btn.value = 'enviando...';

   const serviceID = 'default_service';
   const templateID = 'template_ud00jsu';

   emailjs.sendForm(serviceID, templateID, this)
    .then(() => {
      btn.value = 'Send Email';
      alert('SU MENSAJE FUE ENVIADO!');
    }, (err) => {
      btn.value = 'Send Email';
      alert(JSON.stringify(err));
    });
});


