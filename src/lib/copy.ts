/**
 * Every string the user can read lives here, in português de Portugal.
 * The brand is always written "Easy." — with the full stop. The only places
 * it appears without one are identifiers: file names, URL slugs, storage keys.
 */

export const BRAND = 'Easy.'

export const copy = {
  brand: BRAND,
  tagline: 'Quanto tens, mesmo, para gastar este mês.',

  nav: {
    inicio: 'Início',
    plano: 'Plano',
    fixas: 'Fixas',
    investir: 'Investir',
    documentos: 'Docs',
  },

  onboarding: {
    passo: (n: number, total: number) => `Passo ${n} de ${total}`,
    saltar: 'Saltar',
    voltar: 'Voltar',
    p1Titulo: 'Quanto recebes por mês?',
    p1Ajuda: 'O que te entra na conta, já líquido.',
    p1Continuar: 'Continuar',
    p2Titulo: 'Como queres repartir?',
    p2Ajuda: 'Escolhe um ponto de partida. Mudas quando quiseres.',
    ver: 'Ver o meu bolo.',
  },

  presets: {
    fixas: 'Fixas',
    investir: 'Investir',
    poupar: 'Poupar',
    sobras: 'Sobras',
  },

  home: {
    titulo: 'O teu bolo.',
    heroLabel: 'Disponível para gastar',
    de: (total: string) => `de ${total} que entram`,
    ajustar: 'Ajustar o plano',
    porDiaLabel: 'Por dia',
    porDiaFrase: (valor: string, dia: string) => `Podes gastar ${valor}/dia até ${dia}`,
    porDiaDefice: 'Sem folga diária: o plano está em défice.',
    deficeTitulo: 'Plano em défice',
    deficeFrase: 'Estás a contar com mais do que aquilo que entra.',
    sugestoes: {
      'baixar-investimento': 'Baixa a percentagem de investimento',
      'rever-fixas': 'Revê as despesas fixas',
      'aumentar-rendimento': 'Revê o rendimento que introduziste',
    } as Record<string, string>,
    verPlano: 'Rever o plano',
  },

  legenda: {
    sobras: 'Sobras',
    fixas: 'Despesas fixas',
    investimentos: 'Investimentos',
    poupanca: 'Poupança',
  },

  metricas: {
    taxaPoupanca: 'Taxa de poupança',
    taxaPoupancaFrase: {
      bom: 'Guardas uma boa fatia todos os meses',
      medio: 'Dá para subir mais um pouco',
      baixo: 'Estás a guardar muito pouco',
    },
    pesoFixas: 'Peso das fixas',
    pesoFixasFrase: {
      ok: 'As tuas contas cabem bem no mês',
      alto: 'As tuas contas fixas comem mais de metade do que ganhas',
    },
    fundoEmergencia: 'Fundo de emergência',
    fundoFrase: (meses: string) => `Estás coberto ${meses} meses`,
    fundoMeta: 'Meta: 6 meses',
    custoVida: 'Custo de vida anual',
    custoVidaFrase: (valor: string) => `Viver como vives custa ${valor}/ano`,
  },

  plano: {
    titulo: 'Plano',
    rendimento: 'Rendimento mensal',
    extras: 'Extras',
    extrasAjuda: 'Freelance, subsídios, rendas recebidas.',
    investimentos: 'Investimentos',
    poupanca: 'Poupança',
    despesas: 'Despesas fixas',
    modoPercentagem: 'Percentagem',
    modoLista: 'Lista',
    modoAjuda: 'Estimo por percentagem ou somo a tua lista de despesas.',
    verFixas: 'Ver a lista de despesas',
    limite: 'Chegaste aos 100 %. Baixa outra fatia para subir esta.',
    presetsTitulo: 'Repor um ponto de partida',
    sobrasAgora: 'Sobras',
  },

  fixas: {
    titulo: 'Despesas fixas',
    adicionar: 'Adicionar despesa',
    nome: 'Nome',
    nomePlaceholder: 'Renda, ginásio, Netflix…',
    valor: 'Valor',
    categoria: 'Categoria',
    guardar: 'Guardar',
    cancelar: 'Cancelar',
    apagar: 'Apagar',
    totalMensal: 'Total mensal',
    totalAnual: (valor: string) => `Isto são ${valor}/ano`,
    vazioTitulo: 'Ainda não tens despesas na lista.',
    vazioFrase: 'Adiciona a renda, o carro, as subscrições. Depois o bolo fica certo.',
    apagada: (nome: string) => `${nome} apagada`,
    desfazer: 'Desfazer',
    modoAviso: 'Estás no modo percentagem: esta lista não conta para o cálculo.',
    usarLista: 'Usar esta lista',
  },

  categorias: {
    casa: 'Casa',
    transportes: 'Transportes',
    subscricoes: 'Subscrições',
    saude: 'Saúde',
    creditos: 'Créditos',
    outros: 'Outros',
  },

  investir: {
    titulo: 'Investir',
    fundoAvisoTitulo: 'Antes de investir',
    fundoAviso: '6 meses de despesas em fundo de emergência.',
    fundoEstado: (meses: string) => `Estás em ${meses} meses.`,
    fundoCompleto: 'Já tens os 6 meses cobertos.',
    aInvestir: (valor: string) => `Estás a investir ${valor}/mês`,
    daoEm: (anos: number, valor: string) => `Ao fim de ${anos} anos dão ${valor}`,
    simulador: 'Simulador de juro composto',
    porMes: 'Por mês',
    taxaAnual: 'Taxa anual',
    anos: 'Anos',
    resultado: 'Ao fim do prazo',
    capital: 'O que entregaste',
    juro: 'O que rendeu',
    opcoes: 'Onde se pode pôr o dinheiro',
    risco: 'Risco',
    horizonte: 'Horizonte',
    liquidez: 'Liquidez',
    disclaimer:
      'A Easy. é uma ferramenta de organização pessoal. Não presta aconselhamento financeiro, fiscal ou de investimento. Os valores apresentados são estimativas.',
  },

  documentos: {
    titulo: 'Documentos',
    adicionar: 'Adicionar ficheiros',
    largar: 'Larga aqui os ficheiros',
    todos: 'Todos',
    vazioTitulo: 'Ainda não tens nada guardado.',
    vazioFrase:
      'Guarda aqui o contrato de arrendamento, o seguro do carro, o IRS. Fica tudo no teu telemóvel.',
    aviso: 'Os documentos ficam só neste dispositivo. Se limpares os dados do browser, perdem-se.',
    exportar: 'Exportar tudo',
    aExportar: 'A preparar o ficheiro…',
    abrir: 'Abrir',
    descarregar: 'Descarregar',
    apagar: 'Apagar',
    semPreVisualizacao: 'Este tipo de ficheiro não se pré-visualiza aqui.',
    apagado: (nome: string) => `${nome} apagado`,
    desfazer: 'Desfazer',
  },

  tags: {
    contrato: 'Contratos',
    recibo: 'Recibos',
    seguro: 'Seguros',
    imposto: 'Impostos',
    banco: 'Banco',
    outro: 'Outros',
  },

  definicoes: {
    titulo: 'Definições',
    tema: 'Tema',
    temaAuto: 'Automático',
    temaClaro: 'Claro',
    temaEscuro: 'Escuro',
    diaRecebimento: 'Dia de recebimento',
    diaRecebimentoAjuda: 'Serve para calcular quanto podes gastar por dia.',
    poupancaAcumulada: 'Poupança já acumulada',
    poupancaAcumuladaAjuda: 'O que já tens de lado. Serve para o fundo de emergência.',
    dados: 'Os teus dados',
    exportar: 'Exportar orçamento (JSON)',
    importar: 'Importar orçamento (JSON)',
    importarErro: 'Não consegui ler esse ficheiro.',
    importarOk: 'Orçamento importado.',
    apagar: 'Apagar tudo',
    apagarAviso: 'Isto apaga o orçamento e os documentos deste dispositivo. Não há volta atrás.',
    apagarConfirma: 'Escreve APAGAR para confirmar',
    apagarPalavra: 'APAGAR',
    apagarBotao: 'Apagar definitivamente',
    versao: 'Versão',
    ondeFicam: 'Tudo fica neste dispositivo. A Easy. não usa contas nem servidores.',
  },

  comum: {
    fechar: 'Fechar',
    voltar: 'Voltar',
    definicoes: 'Definições',
    meses: 'meses',
  },
} as const

export const OPCOES_INVESTIMENTO = [
  {
    id: 'certificados',
    nome: 'Certificados de Aforro',
    risco: 1,
    horizonte: 'Médio prazo',
    liquidez: 'Alta, com penalização no início',
    frase: 'Dívida do Estado português, feita para pequenos aforradores.',
  },
  {
    id: 'depositos',
    nome: 'Depósitos a prazo',
    risco: 1,
    horizonte: 'Curto prazo',
    liquidez: 'Alta',
    frase: 'O banco garante o capital e paga juros combinados à partida.',
  },
  {
    id: 'ppr',
    nome: 'PPR',
    risco: 2,
    horizonte: 'Longo prazo',
    liquidez: 'Baixa até à reforma',
    frase: 'Poupança para a reforma, com benefícios fiscais e regras de saída.',
  },
  {
    id: 'etf',
    nome: 'ETF de índice global',
    risco: 4,
    horizonte: 'Longo prazo',
    liquidez: 'Alta',
    frase: 'Segue um índice mundial de ações. Oscila, e recupera com tempo.',
  },
  {
    id: 'risco',
    nome: 'Ativos de risco elevado',
    risco: 5,
    horizonte: 'Indefinido',
    liquidez: 'Variável',
    frase: 'Pode valorizar muito ou perder tudo. Só com dinheiro que te sobra.',
  },
] as const

export const PRESETS = [
  {
    id: 'equilibrado',
    nome: 'Equilibrado',
    frase: 'Um meio-termo confortável.',
    fixas: 50,
    investimentos: 10,
    poupanca: 10,
    sobras: 30,
  },
  {
    id: 'poupador',
    nome: 'Poupador',
    frase: 'Guardas mais, gastas menos.',
    fixas: 50,
    investimentos: 20,
    poupanca: 10,
    sobras: 20,
  },
  {
    id: 'tranquilo',
    nome: 'Tranquilo',
    frase: 'Mais folga ao fim do mês.',
    fixas: 55,
    investimentos: 5,
    poupanca: 5,
    sobras: 35,
  },
] as const

export type Preset = (typeof PRESETS)[number]
