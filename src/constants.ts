export const DEFAULT_PROFESSIONAL_IMAGE = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1000";
export const DEFAULT_USER_IMAGE = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=1000";
export const DEFAULT_COVER_IMAGE = "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=1000";

export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

export const PARENT_CATEGORIES = [
  { id: 'assistencia-tecnica', name: 'Assistência Técnica', icon: 'Smartphone' },
  { id: 'aulas', name: 'Aulas', icon: 'Book' },
  { id: 'automotivo', name: 'Autos', icon: 'Car' },
  { id: 'consultoria', name: 'Consultoria', icon: 'Briefcase' },
  { id: 'design-e-tecnologia', name: 'Design e Tecnologia', icon: 'Code' },
  { id: 'eventos', name: 'Eventos', icon: 'Music' },
  { id: 'moda-e-beleza', name: 'Moda e Beleza', icon: 'Sparkles' },
  { id: 'reformas-e-reparos', name: 'Reformas e Reparos', icon: 'Hammer' },
  { id: 'saude', name: 'Saúde', icon: 'Activity' },
  { id: 'servicos-domesticos', name: 'Serviços Domésticos', icon: 'Home' },
  { id: 'outros', name: 'Outros', icon: 'Plus' }
];

export const CATEGORY_GROUPS: Record<string, Record<string, string[]>> = {
  'assistencia-tecnica': {
    'Eletrodomésticos / Eletrônicos': [
      'Adega climatizada', 'Aparelho de som', 'Aparelhos de ginástica',
      'Aquecedor a gás', 'Ar condicionado', 'Geladeira', 'Máquina de lavar',
      'Microondas', 'TV'
    ],
    'Informática e Telefonia': [
      'Notebook', 'Computador', 'Impressora', 'Celular', 'Tablet', 'Redes'
    ]
  },
  'aulas': {
    'Acadêmicas': ['Matemática', 'Português', 'Física', 'Química', 'Reforço escolar'],
    'Idiomas': ['Inglês', 'Espanhol', 'Francês', 'Alemão'],
    'Artes e Entretenimento': ['Música', 'Dança', 'Teatro', 'Desenho'],
    'Esportes': ['Personal trainer', 'Natação', 'Futebol', 'Tênis']
  },
  'automotivo': {
    'Mecânica': ['Mecânico', 'Troca de óleo', 'Revisão'],
    'Estética Automotiva': ['Polimento', 'Higienização', 'Lava rápido'],
    'Serviços': ['Auto elétrica', 'Funilaria', 'Insulfilm', 'Som automotivo']
  },
  'consultoria': {
    'Jurídico': ['Advogado', 'Consultoria jurídica'],
    'Negócios': ['Consultor empresarial', 'Contador'],
    'Pessoal': ['Coach', 'Tradutor']
  },
  'design-e-tecnologia': {
    'Desenvolvimento': ['Criação de sites', 'Desenvolvimento de apps'],
    'Design': ['Designer gráfico', 'Criação de logo'],
    'Marketing': ['Tráfego pago', 'Social media']
  },
  'eventos': {
    'Alimentação': ['Buffet', 'Churrasqueiro', 'Bartender'],
    'Entretenimento': ['DJ', 'Banda', 'Animador'],
    'Estrutura': ['Fotógrafo', 'Filmagem', 'Segurança']
  },
  'moda-e-beleza': {
    'Estética': ['Manicure', 'Pedicure', 'Esteticista'],
    'Cabelo': ['Cabeleireiro', 'Barbeiro'],
    'Serviços': ['Maquiador', 'Personal stylist']
  },
  'reformas-e-reparos': {
    'Aluguel de Maquinário': ['Aluguel de equipamentos'],
    'Construção': ['Arquiteto', 'Engenheiro', 'Pedreiro', 'Empreiteiro', 'Designer de interiores'],
    'Instalação': ['Antenista', 'Automação residencial', 'Segurança eletrônica', 'Instalador de TV'],
    'Reformas e Reparos': ['Encanador', 'Eletricista', 'Pintor', 'Gesso / drywall', 'Vidraceiro', 'Serralheria'],
    'Serviços Gerais': ['Chaveiro', 'Dedetizador', 'Desentupidor', 'Marceneiro', 'Marido de aluguel', 'Mudanças e carretos'],
    'Para Casa': ['Jardineiro', 'Piscineiro', 'Montador de móveis', 'Decorador', 'Redes de proteção']
  },
  'saude': {
    'Corpo': ['Personal trainer', 'Nutricionista', 'Fisioterapeuta'],
    'Mente': ['Psicólogo', 'Terapeuta'],
    'Estética': ['Estética corporal', 'Estética facial']
  },
  'servicos-domesticos': {
    'Casa': ['Diarista', 'Faxineira', 'Passadeira'],
    'Família': ['Babá', 'Cuidador de idosos', 'Motorista'],
    'Pets': ['Adestrador', 'Passeador de cães']
  }
};

// Flatten map for reverse lookup
const createCategoryToParentMap = () => {
  const map: Record<string, string> = {};
  Object.entries(CATEGORY_GROUPS).forEach(([parentId, groups]) => {
    Object.values(groups).forEach(subcategories => {
      subcategories.forEach(sub => {
        map[sub] = parentId;
      });
    });
  });
  return map;
};

export const CATEGORY_TO_PARENT: Record<string, string> = createCategoryToParentMap();

export const COMMON_CATEGORIES = Object.keys(CATEGORY_TO_PARENT);

export const CATEGORY_SPECIALIZATIONS: Record<string, string[]> = {
  // Assistência Técnica
  'Ar Condicionado': ['Instalação', 'Manutenção', 'Limpeza', 'Recarga de Gás'],
  'Computador': ['Formatação', 'Remoção de Vírus', 'Hardware', 'Redes'],
  'Geladeira e Freezer': ['Manutenção', 'Recarga de Gás', 'Troca de Borracha'],
  'Máquina de Lavar': ['Manutenção', 'Instalação', 'Limpeza'],
  'Fogão e Micro-ondas': ['Conversão de Gás', 'Conserto de Placa', 'Limpeza'],

  // Consultoria
  'Advogado': ['Civil', 'Empresarial', 'Penal', 'Trabalhista', 'Tributário', 'Família'],
  'Contador': ['Auditoria', 'Consultoria empresarial', 'Abertura de Empresa', 'Imposto de Renda'],
  'Marketing': ['Branding', 'Copywriting', 'SEO', 'Social media', 'Tráfego pago'],

  // Reformas
  'Arquiteto': ['Comercial', 'Interiores', 'Residencial', 'Urbanismo'],
  'Eletricista': ['Residencial', 'Predial', 'Industrial', 'Manutenção'],
  'Encanador': ['Vazamentos', 'Instalação Hidráulica', 'Manutenção', 'Esgoto'],
  'Pedreiro': ['Acabamento', 'Construção', 'Revestimento', 'Telhados'],
  'Pintor': ['Látex', 'Textura', 'Grafiato', 'Verniz'],

  // Saúde
  'Nutricionista': ['Esportiva', 'Clínica', 'Emagrecimento', 'Infantil'],
  'Fisioterapeuta': ['Ortopédica', 'Respiratória', 'Neurológica', 'RPG'],
  'Psicólogo': ['Terapia Individual', 'Casal', 'Infantil', 'Ansiedade/Depressão'],

  // Moda e Beleza
  'Cabeleireiro': ['Corte', 'Coloração', 'Escova', 'Penteados'],
  'Maquiadora': ['Social', 'Noivas', 'Festas', 'Artistica'],
  'Manicure': ['Pé e Mão', 'Unhas em Gel', 'Esmaltação'],

  // Eventos
  'Buffet': ['Casamentos', 'Festas Infantis', 'Corporativo', 'Coffee Break'],
  'Música e DJ': ['DJ para Festas', 'Bandas', 'Acústico'],

  // Domésticos
  'Diarista': ['Limpeza Padrão', 'Pesada', 'Pós-obra', 'Passadoria'],
  'Adestrador de Cães': ['Obediência', 'Comportamento', 'Filhotes']
};
