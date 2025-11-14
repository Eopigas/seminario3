(function(){
const logEl=()=>document.getElementById('login-log');
function safeLog(m){console.log(m); if(logEl()) logEl().textContent=m;}
function seed(){ if(localStorage.getItem('ci_demo_v1')) return;
 localStorage.setItem('ci_demo_v1', JSON.stringify({Pessoa:[{Email:'aluno@example.com'}]}));}
function attempt(email,pass){
 if(email==='aluno@example.com'&&pass==='123') return true;
 return false;
}
function init(){
 seed();
 const btn=document.getElementById('btn-login');
 if(!btn){console.error('btn missing');return;}
 btn.addEventListener('click',e=>{
  e.preventDefault();
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-pass').value;
  if(attempt(email,pass)){ window.location='dashboard.html'; }
  else safeLog('Usuário ou senha incorretos');
 });
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();