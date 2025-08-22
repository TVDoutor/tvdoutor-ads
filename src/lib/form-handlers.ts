import { registerUser, loginUser } from './auth';

/**
 * Handler para formulário de cadastro
 * @param formData Dados do formulário (name, email, password)
 * @returns Promise com resultado do cadastro
 */
export async function handleRegisterForm(formData: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    // Validações básicas
    if (!formData.name.trim()) {
      throw new Error('Nome é obrigatório');
    }

    if (!formData.email.trim()) {
      throw new Error('Email é obrigatório');
    }

    if (!formData.password || formData.password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    // Chamar função de registro
    const data = await registerUser(formData.name, formData.email, formData.password);

    return {
      success: true,
      message: 'Conta criada com sucesso! Perfil criado na base de dados.',
      data
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      data: null
    };
  }
}

/**
 * Handler para formulário de login
 * @param formData Dados do formulário (email, password)
 * @returns Promise com resultado do login
 */
export async function handleLoginForm(formData: {
  email: string;
  password: string;
}) {
  try {
    // Validações básicas
    if (!formData.email.trim()) {
      throw new Error('Email é obrigatório');
    }

    if (!formData.password) {
      throw new Error('Senha é obrigatória');
    }

    // Chamar função de login
    const data = await loginUser(formData.email, formData.password);

    return {
      success: true,
      message: 'Login realizado com sucesso!',
      data
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      data: null
    };
  }
}

// Exemplo de uso em um componente React:
/*
import { handleRegisterForm } from '@/lib/form-handlers';

const MyRegisterComponent = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await handleRegisterForm(formData);
    
    if (result.success) {
      console.log('Sucesso:', result.message);
      // Redirecionar ou mostrar mensagem de sucesso
    } else {
      console.error('Erro:', result.message);
      // Mostrar mensagem de erro
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <input 
        type="text" 
        placeholder="Nome"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      <input 
        type="email" 
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
      />
      <input 
        type="password" 
        placeholder="Senha"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
      />
      <button type="submit">Cadastrar</button>
    </form>
  );
};
*/
