// Script para testar o sistema de roles no frontend
// Execute este script no console do navegador quando logado

console.log('=== TESTE DO SISTEMA DE ROLES ===');

// 1. Verificar se o AuthContext está disponível
if (typeof window !== 'undefined' && window.React) {
  console.log('React está disponível');
} else {
  console.log('React não está disponível no escopo global');
}

// 2. Verificar localStorage para dados de autenticação
const authData = localStorage.getItem('supabase.auth.token');
if (authData) {
  console.log('Token de autenticação encontrado no localStorage');
  try {
    const parsed = JSON.parse(authData);
    console.log('Dados do token:', parsed);
  } catch (e) {
    console.log('Erro ao parsear token:', e);
  }
} else {
  console.log('Nenhum token de autenticação encontrado');
}

// 3. Verificar se há dados do perfil no localStorage
const profileData = localStorage.getItem('profile');
if (profileData) {
  console.log('Dados do perfil encontrados:', JSON.parse(profileData));
} else {
  console.log('Nenhum dado de perfil encontrado');
}

// 4. Função para testar a função hasRole
function testHasRole() {
  // Esta função seria chamada dentro do contexto React
  console.log('Para testar hasRole, você precisa estar dentro do contexto React');
  console.log('Use: const { hasRole } = useAuth();');
  console.log('Depois teste: hasRole("manager")');
}

// 5. Verificar elementos do menu na DOM
const menuItems = document.querySelectorAll('[data-testid="menu-item"], .sidebar nav button');
console.log('Itens do menu encontrados:', menuItems.length);

menuItems.forEach((item, index) => {
  const text = item.textContent?.trim();
  console.log(`Item ${index + 1}:`, text);
});

// 6. Verificar se há elementos ocultos (que deveriam estar visíveis para manager)
const hiddenItems = document.querySelectorAll('.sidebar nav button[style*="display: none"], .sidebar nav button.hidden');
console.log('Itens ocultos encontrados:', hiddenItems.length);

// 7. Instruções para debug manual
console.log('\n=== INSTRUÇÕES PARA DEBUG MANUAL ===');
console.log('1. Abra o DevTools (F12)');
console.log('2. Vá para a aba Console');
console.log('3. Execute: window.React.useContext(window.AuthContext)');
console.log('4. Verifique o objeto retornado para ver o role atual');
console.log('5. Teste: hasRole("manager")');

// 8. Verificar se há erros no console
console.log('\n=== VERIFICAÇÃO DE ERROS ===');
console.log('Verifique se há erros relacionados a:');
console.log('- Supabase queries');
console.log('- AuthContext');
console.log('- Role permissions');
console.log('- Menu rendering');

testHasRole();
