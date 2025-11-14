// Professional static app (Netlify) - simulated SQL data in localStorage
const APP_KEY = 'ci_demo_v1';

// --- seed data based on user's SQL schema (simplified) ---
function seedIfEmpty(){
  if(localStorage.getItem(APP_KEY)) return;
  const now = new Date().toISOString().slice(0,10);
  const data = {
    Pais: [{Id_Pais:1, Nome:'Brasil'}],
    Estado: [{Id_Estado:1, Id_Pais:1, Nome:'São Paulo'}],
    Endereco: [{Id_Endereco:1, Id_Estado:1}],
    Pessoa: [{Id_Pessoa:1, Id_Endereco:1, Nome:'Aluno', Sobrenome:'Demo', Email:'aluno@example.com', Sexo:'M', Telefone:'11999999999', Data_Nascimento:'1990-01-01'}],
    Perfil: [{Id_Perfil:1, Perfil:'Cliente Padrão'}],
    Cliente: [{Id_Cliente:1, Id_Pessoa:1, Id_Perfil:1, Data_Registro:now}],
    Tipo: [{Id_Tipo:1, Tipo:'Ações'},{Id_Tipo:2, Tipo:'Cripto'},{Id_Tipo:3, Tipo:'Renda Fixa'}],
    Risco: [{Id_Risco:1, Risco:'Alto'},{Id_Risco:2, Risco:'Médio'},{Id_Risco:3, Risco:'Baixo'}],
    Investimento: [{Id_Investimento:1, Id_Tipo:1, Id_Risco:2, Nome:'VALE3', Rentabilidade_Prevista:0.12, Descricao:'Ação exemplo'},{Id_Investimento:2, Id_Tipo:2, Id_Risco:1, Nome:'Bitcoin', Rentabilidade_Prevista:0.2, Descricao:'Cripto exemplo'}],
    Carteira: [{Id_Carteira:1, Id_Cliente:1, Nome:'Carteira Demo', Data_Criacao:now}],
    ItensCarteira: [{Id_Carteira:1, Id_Investimento:1, Data_Aquisicao:now},{Id_Carteira:1, Id_Investimento:2, Data_Aquisicao:now}],
    Funcionario: [{Id_Funcionario:1, Id_Pessoa:1, Id_Contrato:1, Id_Status:1}],
    Consultor: [{Id_Consultor:1, Id_Funcionario:1, Id_Situacao:1, Descricao:'Consultor chefe'}],
    Situacao: [{Id_Situacao:1, Situacao:'Ativo', Data_Atribuicao:now, Descricao:'Ativo'}],
    Departamento: [{Id_Departamento:1, Nome:'Consultoria'}],
    Cargo: [{Id_Cargo:1, Nome:'Analista', Salario_Base:5000.0}],
    Contrato: [{Id_Contrato:1, Id_Departamento:1, Id_Cargo:1, Data_Contrato:now}],
    Bonus: [],
    Orientacao: [],
    ItensOrientacao: []
  };
  localStorage.setItem(APP_KEY, JSON.stringify(data));
}

// --- helpers to access data ---
function db(){ return JSON.parse(localStorage.getItem(APP_KEY) || '{}'); }
function saveDb(d){ localStorage.setItem(APP_KEY, JSON.stringify(d)); }

// --- auth ---
function login(email, password){
  // demo credential: aluno@example.com / 123
  if(email === 'aluno@example.com' && password === '123'){
    sessionStorage.setItem('ci_user', email);
    return true;
  }
  return false;
}
function logout(){
  sessionStorage.removeItem('ci_user');
  window.location = 'index.html';
}
function isAuth(){ return !!sessionStorage.getItem('ci_user'); }
function requireAuth(){ if(!isAuth()) window.location='index.html'; }

// --- small UI utils ---
function el(html){ const div=document.createElement('div'); div.innerHTML=html; return div.firstElementChild; }
function formatBR(val){ return Number(val).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2}); }

// --- Dashboard rendering ---
let pieTypesChart = null;
let pieInvestChart = null;

function renderOverview(){
  requireAuth();
  const d = db();
  const clients = (d.Cliente||[]).length;
  const consultants = (d.Consultor||[]).length;
  const investments = (d.Investimento||[]).length;
  document.getElementById('view-area').innerHTML = '';
  const tpl = document.getElementById('tpl-overview').content.cloneNode(true);
  document.getElementById('view-area').appendChild(tpl);

  document.getElementById('stat-clients').textContent = clients;
  document.getElementById('stat-consultants').textContent = consultants;
  document.getElementById('stat-investments').textContent = investments;

  // pie by Tipo (from carteira items)
  const tipos = {};
  const tiposMap = (d.Tipo||[]).reduce((acc,t)=>{ acc[t.Id_Tipo]=t.Tipo; return acc; }, {});
  (d.ItensCarteira||[]).forEach(it=>{
    const inv = (d.Investimento||[]).find(x=>x.Id_Investimento===it.Id_Investimento);
    if(!inv) return;
    const tipoName = tiposMap[inv.Id_Tipo] || 'Outro';
    tipos[tipoName] = (tipos[tipoName]||0) + 1;
  });
  const labels = Object.keys(tipos);
  const values = labels.map(l=>tipos[l]);

  const ctx = document.getElementById('pieTypes').getContext('2d');
  if(pieTypesChart) pieTypesChart.destroy();
  pieTypesChart = new Chart(ctx, {type:'pie', data:{labels, datasets:[{data:values, backgroundColor:['#ff7a00','#fb8f24','#1f2937','#a3a3a3']}],}, options:{responsive:true}});

  // summary
  document.getElementById('summaryText').textContent = `Total de clientes: ${clients}. Total de investimentos cadastrados: ${investments}.`;
}

// --- Chat rendering and logic ---
const QUICK_PHRASES = ['Bom dia','Meus investimentos','Taxa / Rendimentos','Quero ajuda'];
function renderChat(){
  requireAuth();
  document.getElementById('view-area').innerHTML = '';
  const tpl = document.getElementById('tpl-chat').content.cloneNode(true);
  document.getElementById('view-area').appendChild(tpl);
  const history = document.getElementById('chat-history');
  history.innerHTML = '<div class="small muted">Início do chat — histórico local</div>';

  const qbox = document.getElementById('quick-btns');
  QUICK_PHRASES.forEach(p=>{
    const b = document.createElement('button');
    b.className = 'quick-btn';
    b.textContent = p;
    b.onclick = ()=> { sendChat(p); };
    qbox.appendChild(b);
  });

  document.getElementById('chat-send').onclick = ()=>{
    const v = document.getElementById('chat-input').value.trim();
    if(!v) return;
    sendChat(v);
    document.getElementById('chat-input').value='';
  };
}

function sendChat(text){
  const h = document.getElementById('chat-history');
  const userHtml = `<div class="msg user"><div class="bubble">${escapeHtml(text)}</div></div>`;
  h.innerHTML += userHtml;
  h.scrollTop = h.scrollHeight;
  // simple rule-based replies
  const t = text.toLowerCase();
  let reply = 'Desculpe, não entendi. Posso ajudar com investimentos, carteira ou risco.';
  if(t.includes('invest')) reply = 'Posso mostrar sua carteira ou cadastrar um novo investimento.';
  if(t.includes('taxa')||t.includes('rend')) reply = 'Rentabilidade prevista: ex. renda fixa 6-8% ao ano.';
  if(t.includes('meus') && t.includes('invest')) reply = 'Abrindo seus investimentos...';
  const botHtml = `<div class="msg bot"><div class="bubble">${reply}</div></div>`;
  setTimeout(()=>{ h.innerHTML += botHtml; h.scrollTop = h.scrollHeight; }, 300);
}

// --- Investments UI ---
function renderInvestPage(){
  requireAuth();
  document.getElementById('view-area').innerHTML = '';
  const tpl = document.getElementById('tpl-invest').content.cloneNode(true);
  document.getElementById('view-area').appendChild(tpl);
  populateInvestTypes();

  document.getElementById('inv-add').onclick = ()=>{
    const name = document.getElementById('inv-name').value.trim();
    const tipo = Number(document.getElementById('inv-type').value);
    const valor = parseFloat(document.getElementById('inv-value').value) || 0;
    if(!name || !tipo) { alert('Preencha nome e tipo'); return; }
    const d = db();
    const nextId = ((d.Investimento||[]).reduce((m,x)=>Math.max(m,x.Id_Investimento),0)||0) + 1;
    const inv = {Id_Investimento: nextId, Id_Tipo: tipo, Id_Risco:1, Nome: name, Rentabilidade_Prevista: valor, Descricao:''};
    d.Investimento = d.Investimento || [];
    d.Investimento.push(inv);
    // link to first carteira
    const carte = (d.Carteira && d.Carteira[0]) || null;
    if(!carte){
      const cid = ((d.Carteira||[]).reduce((m,x)=>Math.max(m,x.Id_Carteira),0)||0) + 1;
      d.Carteira = d.Carteira || [];
      d.Carteira.push({Id_Carteira:cid, Id_Cliente:1, Nome:'Carteira principal', Data_Criacao:new Date().toISOString().slice(0,10)});
      d.ItensCarteira = d.ItensCarteira || [];
      d.ItensCarteira.push({Id_Carteira: cid, Id_Investimento: nextId, Data_Aquisicao:new Date().toISOString().slice(0,10)});
    } else {
      d.ItensCarteira = d.ItensCarteira || [];
      d.ItensCarteira.push({Id_Carteira: carte.Id_Carteira, Id_Investimento: nextId, Data_Aquisicao:new Date().toISOString().slice(0,10)});
    }
    saveDb(d);
    renderInvestPage();
  };

  renderInvestTable();
  renderInvestPie();
}

function populateInvestTypes(){
  const d = db();
  const sel = document.getElementById('inv-type');
  sel.innerHTML = '<option value="">Selecione tipo</option>';
  (d.Tipo||[]).forEach(t=>{
    const opt = document.createElement('option');
    opt.value = t.Id_Tipo;
    opt.textContent = t.Tipo;
    sel.appendChild(opt);
  });
}

function renderInvestTable(){
  const d = db();
  const tbody = document.querySelector('#invest-table tbody');
  tbody.innerHTML = '';
  const items = d.ItensCarteira || [];
  items.forEach(it=>{
    const inv = (d.Investimento||[]).find(x=>x.Id_Investimento===it.Id_Investimento);
    const tipo = (d.Tipo||[]).find(t=>t.Id_Tipo===inv.Id_Tipo);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(inv.Nome)}</td><td>${escapeHtml(tipo ? tipo.Tipo : '')}</td><td>R$ ${formatBR(inv.Rentabilidade_Prevista || 0)}</td><td><button class="btn ghost" onclick="removeInvestment(${inv.Id_Investimento})">Remover</button></td>`;
    tbody.appendChild(tr);
  });
}

function removeInvestment(id){
  if(!confirm('Remover investimento?')) return;
  const d = db();
  d.Investimento = (d.Investimento||[]).filter(x=>x.Id_Investimento!==id);
  d.ItensCarteira = (d.ItensCarteira||[]).filter(x=>x.Id_Investimento!==id);
  saveDb(d);
  renderInvestPage();
}

function renderInvestPie(){
  const d = db();
  const totals = {};
  (d.ItensCarteira||[]).forEach(it=>{
    const inv = (d.Investimento||[]).find(x=>x.Id_Investimento===it.Id_Investimento);
    const tipoName = ((d.Tipo||[]).find(t=>t.Id_Tipo===inv.Id_Tipo)||{}).Tipo || 'Outro';
    totals[tipoName] = (totals[tipoName]||0) + (inv.Rentabilidade_Prevista || 0);
  });
  const labels = Object.keys(totals);
  const data = labels.map(l=>totals[l]);
  const ctx = document.getElementById('pieInvest') && document.getElementById('pieInvest').getContext('2d');
  if(!ctx) return;
  if(pieInvestChart) pieInvestChart.destroy();
  pieInvestChart = new Chart(ctx, {type:'pie', data:{labels, datasets:[{data, backgroundColor:['#ff7a00','#fb8f24','#1f2937','#a3a3a3']}],}, options:{responsive:true}});
}

// --- Data explorer (tables) ---
function renderDataTables(){
  requireAuth();
  const d = db();
  document.getElementById('view-area').innerHTML = '';
  const tpl = document.getElementById('tpl-data').content.cloneNode(true);
  document.getElementById('view-area').appendChild(tpl);

  // simple tables
  const makeTable = (arr, fields) => {
    const table = document.createElement('table'); table.className='table';
    const thead = document.createElement('thead'); const tr = document.createElement('tr');
    fields.forEach(f=>{ const th = document.createElement('th'); th.textContent=f; tr.appendChild(th); }); thead.appendChild(tr); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    arr.forEach(r=>{ const tr2 = document.createElement('tr'); fields.forEach(f=>{ const td = document.createElement('td'); td.textContent = r[f] || ''; tr2.appendChild(td); }); tbody.appendChild(tr2); });
    table.appendChild(tbody); return table;
  };

  document.getElementById('table-clients').appendChild(makeTable(d.Cliente||[], ['Id_Cliente','Id_Pessoa','Id_Perfil','Data_Registro']));
  document.getElementById('table-employees').appendChild(makeTable(d.Funcionario||[], ['Id_Funcionario','Id_Pessoa','Id_Contrato','Id_Status']));
  document.getElementById('table-invests').appendChild(makeTable(d.Investimento||[], ['Id_Investimento','Nome','Id_Tipo','Id_Risco','Rentabilidade_Prevista']));
}

// --- Router ---
function navigateTo(route){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const btn = Array.from(document.querySelectorAll('.nav-btn')).find(x=>x.dataset.route===route);
  if(btn) btn.classList.add('active');
  if(route==='overview') renderOverview();
  if(route==='chat') renderChat();
  if(route==='invest') renderInvestPage();
  if(route==='data') renderDataTables();
}

// --- startup ---
function initApp(){
  seedIfEmpty();
  // attach login handler on index page
  const loginBtn = document.getElementById('btn-login');
  if(loginBtn){
    loginBtn.onclick = ()=>{
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-pass').value.trim();
      if(login(email,pass)){ location.href='dashboard.html'; } else { alert('Credenciais inválidas'); }
    };
  }

  // dashboard nav handlers
  document.querySelectorAll('.nav-btn').forEach(b=> b.addEventListener('click', e=> navigateTo(e.currentTarget.dataset.route));
  );

  // global logout/back handlers
  const logoutBtn = document.getElementById('btn-logout');
  if(logoutBtn) logoutBtn.onclick = logout;
  const backBtns = document.querySelectorAll('#btn-back-dashboard');
  backBtns.forEach(b=> b.addEventListener('click', ()=> location.href='dashboard.html'));

  // if on dashboard page initialize overview
  if(document.getElementById('view-area')){
    if(!isAuth()) { location.href='index.html'; return; }
    navigateTo('overview');
  }

  // standalone chat page quick buttons
  const chatSend = document.getElementById('chat-send');
  if(chatSend){
    document.getElementById('chat-send').onclick = ()=>{ const v=document.getElementById('chat-input').value.trim(); if(v) sendChat(v); };
    const qbox = document.getElementById('quick-btns');
    if(qbox){
      ['Bom dia','Meus investimentos','Taxa / Rendimentos','Quero ajuda'].forEach(p=>{ const b=document.createElement('button'); b.className='quick-btn'; b.textContent=p; b.onclick=()=>sendChat(p); qbox.appendChild(b); });
    }
  }

  // if on invest page initialize types and render
  if(document.getElementById('inv-add')){
    document.getElementById('inv-add').onclick = ()=>{ const name=document.getElementById('inv-name').value.trim(); const val=document.getElementById('inv-value').value.trim(); const tipo=document.getElementById('inv-type').value; if(!name||!tipo){ alert('Preencha nome e tipo'); return; } renderInvestPage(); };
    populateInvestTypes();
  }
}

function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// init
document.addEventListener('DOMContentLoaded', initApp);
