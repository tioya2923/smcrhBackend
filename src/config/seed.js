require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User, Propina, News, Event, Horario, Comunicado, Material, ForumPost, PageContent, TeamMember } = require('../models');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  console.log('Seeding database...');

  // ── Super-administrador (gere as duas Secções) ──────────────────────────────
  const superAdmin = await User.create({
    nome: 'Pe. Director Geral',
    email: 'admin@cristorei.ao',
    password_hash: 'Admin@1234',
    permissoes: 'admin',
    seccao: null, // acesso global
    ativo: true,
  });

  // ── Direcção da Secção de Teologia ─────────────────────────────────────────
  const reitorTeo = await User.create({
    nome: 'Pe. António Lúcio Ferreira',
    email: 'reitor.teologia@cristorei.ao',
    password_hash: 'Admin@1234',
    permissoes: 'admin',
    seccao: 'teologia',
    ativo: true,
  });

  const staffTeo1 = await User.create({
    nome: 'Pe. João Paulo Mendes',
    email: 'staff.teo1@cristorei.ao',
    password_hash: 'Staff@1234',
    permissoes: 'staff',
    seccao: 'teologia',
    ativo: true,
  });

  const staffTeo2 = await User.create({
    nome: 'Pe. Manuel Costa Silva',
    email: 'staff.teo2@cristorei.ao',
    password_hash: 'Staff@1234',
    permissoes: 'staff',
    seccao: 'teologia',
    ativo: true,
  });

  // ── Direcção da Secção de Filosofia ────────────────────────────────────────
  const reitorFil = await User.create({
    nome: 'Pe. Carlos Eduardo Neto',
    email: 'reitor.filosofia@cristorei.ao',
    password_hash: 'Admin@1234',
    permissoes: 'admin',
    seccao: 'filosofia',
    ativo: true,
  });

  const staffFil1 = await User.create({
    nome: 'Pe. Filipe Augusto Lopes',
    email: 'staff.fil1@cristorei.ao',
    password_hash: 'Staff@1234',
    permissoes: 'staff',
    seccao: 'filosofia',
    ativo: true,
  });

  const staffFil2 = await User.create({
    nome: 'Irmã Maria da Graça',
    email: 'staff.fil2@cristorei.ao',
    password_hash: 'Staff@1234',
    permissoes: 'staff',
    seccao: 'filosofia',
    ativo: true,
  });

  // ── Seminaristas da Secção de Teologia (4 anos) ────────────────────────────
  const nomesTeo = [
    'Tomás Agostinho Lemos',
    'Bernardo Kalunga Nzaji',
    'Ezequiel Mário Domingos',
    'Rafael Sebastião Pinto',
    'Lourenço Afonso Cunha',
    'Dário Paulo Figueiredo',
    'Samuel Evaristo Carvalho',
    'Hélder Vicente Mateus',
  ];
  const semTeo = [];
  for (let i = 0; i < nomesTeo.length; i++) {
    const s = await User.create({
      nome: nomesTeo[i],
      email: `sem.teo${i + 1}@cristorei.ao`,
      password_hash: 'Seminarista@1234',
      permissoes: 'seminarista',
      seccao: 'teologia',
      ano_formacao: (i % 4) + 1, // 1.º ao 4.º ano
      data_entrada: new Date(2021 + Math.floor(i / 4), 8, 1),
      ativo: true,
    });
    await Propina.create({
      user_id: s.id,
      montante_mensal: 55000,
      moeda: 'AOA',
      data_vencimento: new Date(2026, 4, 15),
      saldo_devedor: i % 3 === 0 ? 55000 : 0,
      bolsa: i === 2,
      desconto_percentagem: i === 2 ? 50 : 0,
    });
    semTeo.push(s);
  }

  // ── Seminaristas da Secção de Filosofia (3 anos) ───────────────────────────
  const nomesFil = [
    'André Luciano Baptista',
    'Celestino Muanda Kongo',
    'Domingos Ferreira Neto',
    'Ernesto Álvaro Sequeira',
    'Francisco Xavier Alves',
    'Gabriel Henrique Costa',
  ];
  const semFil = [];
  for (let i = 0; i < nomesFil.length; i++) {
    const s = await User.create({
      nome: nomesFil[i],
      email: `sem.fil${i + 1}@cristorei.ao`,
      password_hash: 'Seminarista@1234',
      permissoes: 'seminarista',
      seccao: 'filosofia',
      ano_formacao: (i % 3) + 1, // 1.º ao 3.º ano
      data_entrada: new Date(2022 + Math.floor(i / 3), 8, 1),
      ativo: true,
    });
    await Propina.create({
      user_id: s.id,
      montante_mensal: 50000,
      moeda: 'AOA',
      data_vencimento: new Date(2026, 4, 15),
      saldo_devedor: i % 4 === 0 ? 50000 : 0,
      bolsa: i === 3,
      desconto_percentagem: i === 3 ? 30 : 0,
    });
    semFil.push(s);
  }

  // ── Notícias ────────────────────────────────────────────────────────────────
  const newsData = [
    { titulo: 'Ordenação sacerdotal de novos presbíteros da Secção de Teologia', categoria: 'eventos', destaque: true,
      resumo: 'Com grande alegria, o Seminário celebra a ordenação de três diáconos da Secção de Teologia.',
      conteudo: '<p>Com grande alegria, o Seminário Maior de Cristo Rei celebra a ordenação de três novos sacerdotes para a Arquidiocese do Huambo, provenientes da Secção de Teologia.</p>' },
    { titulo: 'Início do ano académico 2025/2026 nas duas Secções', categoria: 'academico', destaque: true,
      resumo: 'A Secção de Teologia acolhe 8 seminaristas e a Secção de Filosofia 6 novos candidatos.',
      conteudo: '<p>Com grande entusiasmo, o Seminário Maior de Cristo Rei abre as suas portas a um novo ano de formação integral nas suas duas Secções: Teologia e Filosofia.</p>' },
    { titulo: 'Visita pastoral do Sr. Arcebispo às duas Secções', categoria: 'comunidade', destaque: false,
      resumo: 'O Sr. Arcebispo presidiu à Eucaristia e encontrou-se com as duas comunidades seminarísticas.',
      conteudo: '<p>O Sr. Arcebispo visitou as duas comunidades seminarísticas e presidiu à celebração eucarística comum, sublinhando a unidade e a diversidade do Seminário.</p>' },
  ];
  for (const n of newsData) {
    await News.create({
      ...n, autor_id: superAdmin.id, publicado: true, data_publicacao: new Date(),
      slug: n.titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80),
    });
  }

  // ── Eventos ─────────────────────────────────────────────────────────────────
  await Event.create({ titulo: 'Festa de Cristo Rei (ambas as Secções)', descricao: 'Celebração solene do Padroeiro com toda a comunidade seminarística', data_inicio: new Date(2026, 10, 22), tipo: 'liturgico', publico: true, criado_por: superAdmin.id });
  await Event.create({ titulo: 'Exames da Secção de Teologia – 1.º Semestre', descricao: 'Período de avaliações académicas da Secção de Teologia', data_inicio: new Date(2026, 0, 15), data_fim: new Date(2026, 0, 31), tipo: 'academico', publico: false, criado_por: reitorTeo.id });
  await Event.create({ titulo: 'Exames da Secção de Filosofia – 1.º Semestre', descricao: 'Período de avaliações académicas da Secção de Filosofia', data_inicio: new Date(2026, 0, 18), data_fim: new Date(2026, 0, 28), tipo: 'academico', publico: false, criado_por: reitorFil.id });
  await Event.create({ titulo: 'Retiro Espiritual da Secção de Teologia', descricao: 'Retiro anual de espiritualidade para os teólogos', data_inicio: new Date(2026, 2, 10), data_fim: new Date(2026, 2, 13), tipo: 'formacao', publico: false, criado_por: staffTeo1.id });
  await Event.create({ titulo: 'Retiro Espiritual da Secção de Filosofia', descricao: 'Retiro anual de espiritualidade para os filósofos', data_inicio: new Date(2026, 2, 17), data_fim: new Date(2026, 2, 20), tipo: 'formacao', publico: false, criado_por: staffFil1.id });

  // ── Horários da Secção de Teologia (anos 1–4) ───────────────────────────────
  const disciplinasTeo = [
    'Sagrada Escritura (AT)', 'Sagrada Escritura (NT)', 'Teologia Sistemática',
    'Teologia Moral', 'Patrística', 'Liturgia e Sacramentos',
    'Direito Canónico', 'Teologia Pastoral', 'Homilética',
  ];
  const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  for (let ano = 1; ano <= 4; ano++) {
    for (let i = 0; i < 4; i++) {
      await Horario.create({
        seccao: 'teologia',
        ano_formacao: ano,
        dia_semana: dias[i % dias.length],
        hora_inicio: `0${8 + i}:00`,
        hora_fim: `0${9 + i}:30`,
        disciplina: disciplinasTeo[(ano - 1 + i) % disciplinasTeo.length],
        professor: 'Pe. ' + ['António Ferreira', 'João Mendes', 'Manuel Silva', 'Pedro Alves'][i],
        sala: `Sala T${ano * 10 + i}`,
      });
    }
  }

  // ── Horários da Secção de Filosofia (anos 1–3) ──────────────────────────────
  const disciplinasFil = [
    'Filosofia Geral', 'Lógica e Epistemologia', 'Metafísica',
    'Ética e Filosofia Moral', 'História da Filosofia', 'Filosofia da Religião',
    'Introdução à Teologia', 'Latim', 'Grego',
  ];
  for (let ano = 1; ano <= 3; ano++) {
    for (let i = 0; i < 4; i++) {
      await Horario.create({
        seccao: 'filosofia',
        ano_formacao: ano,
        dia_semana: dias[i % dias.length],
        hora_inicio: `0${8 + i}:00`,
        hora_fim: `0${9 + i}:30`,
        disciplina: disciplinasFil[(ano - 1 + i) % disciplinasFil.length],
        professor: 'Pe. ' + ['Carlos Neto', 'Filipe Lopes', 'Gustavo Ramos', 'Hélio Santos'][i],
        sala: `Sala F${ano * 10 + i}`,
      });
    }
  }

  // ── Comunicados ─────────────────────────────────────────────────────────────
  await Comunicado.create({
    titulo: 'Normas do novo ano lectivo 2025/2026 – Secção de Teologia',
    conteudo: '<p>Caros seminaristas da Secção de Teologia, informamos que o novo ano lectivo terá início no dia 8 de Setembro. Consultem o regulamento actualizado no portal.</p>',
    autor_id: reitorTeo.id,
    destinatarios: 'todos',
    seccao: 'teologia',
  });
  await Comunicado.create({
    titulo: 'Normas do novo ano lectivo 2025/2026 – Secção de Filosofia',
    conteudo: '<p>Caros seminaristas da Secção de Filosofia, informamos que o novo ano lectivo terá início no dia 8 de Setembro. Consultem o regulamento actualizado no portal.</p>',
    autor_id: reitorFil.id,
    destinatarios: 'todos',
    seccao: 'filosofia',
  });
  await Comunicado.create({
    titulo: 'Festa de Cristo Rei – toda a comunidade seminarística',
    conteudo: '<p>Comunicamos a toda a comunidade das duas Secções que a Festa de Cristo Rei será celebrada a 22 de Novembro com Missa solene presidida pelo Sr. Arcebispo.</p>',
    autor_id: superAdmin.id,
    destinatarios: 'todos',
    seccao: 'todas',
  });

  // ── Fórum ───────────────────────────────────────────────────────────────────
  await ForumPost.create({
    titulo: 'Dúvidas sobre Teologia Sistemática – 2.º Ano',
    conteudo: 'Caros irmãos, alguém tem apontamentos sobre a aula de cristologia do Pe. João?',
    autor_id: semTeo[1].id,
    seccao: 'teologia',
    categoria: 'academico',
    fixado: false,
  });
  await ForumPost.create({
    titulo: 'Aviso: Mudança de sala – Patrística',
    conteudo: 'A aula de Patrística de amanhã passa para a Sala T20.',
    autor_id: staffTeo1.id,
    seccao: 'teologia',
    categoria: 'geral',
    fixado: true,
  });
  await ForumPost.create({
    titulo: 'Recursos de Latim para o 1.º Ano',
    conteudo: 'Partilho alguns recursos úteis para o estudo do Latim neste primeiro ano.',
    autor_id: semFil[0].id,
    seccao: 'filosofia',
    categoria: 'academico',
    fixado: false,
  });
  await ForumPost.create({
    titulo: 'Aviso: Horário de Confissões alterado',
    conteudo: 'O Pe. Director informa que o horário de confissões passa para as 16h30.',
    autor_id: staffFil1.id,
    seccao: 'filosofia',
    categoria: 'geral',
    fixado: true,
  });

  // ── Equipa Formadora (TeamMember) ─────────────────────────────────────────
  const equipaTeo = [
    { nome: 'Pe. António Lúcio Ferreira', cargo: 'Reitor', area: 'Direcção', seccao: 'teologia', ordem: 1 },
    { nome: 'Pe. João Paulo Mendes', cargo: 'Vice-Reitor e Prefeito de Disciplina', area: 'Direcção', seccao: 'teologia', ordem: 2 },
    { nome: 'Pe. Manuel Costa Silva', cargo: 'Director Espiritual', area: 'Espiritual', seccao: 'teologia', ordem: 3 },
  ];
  const equipaFil = [
    { nome: 'Pe. Carlos Eduardo Neto', cargo: 'Reitor', area: 'Direcção', seccao: 'filosofia', ordem: 1 },
    { nome: 'Pe. Filipe Augusto Lopes', cargo: 'Vice-Reitor e Prefeito de Disciplina', area: 'Direcção', seccao: 'filosofia', ordem: 2 },
    { nome: 'Irmã Maria da Graça', cargo: 'Directora Espiritual', area: 'Espiritual', seccao: 'filosofia', ordem: 3 },
  ];
  for (const m of [...equipaTeo, ...equipaFil]) await TeamMember.create(m);

  // ── Conteúdo das páginas (PageContent) ────────────────────────────────────
  const conteudos = [
    // Contactos
    { pagina: 'contactos', chave: 'morada', valor: 'Av. da República, s/n\nHuambo, Angola', tipo: 'text' },
    { pagina: 'contactos', chave: 'telefone', valor: '+244 222 000 000', tipo: 'text' },
    { pagina: 'contactos', chave: 'email', valor: 'info@cristorei.ao', tipo: 'text' },
    { pagina: 'contactos', chave: 'horario', valor: 'Seg–Sex: 08:00–16:00\nSáb: 08:00–12:00', tipo: 'text' },

    // Como Ajudar
    { pagina: 'ajudar', chave: 'hero_subtitulo', valor: 'A sua generosidade transforma vidas e forma sacerdotes ao serviço de Angola.', tipo: 'text' },
    { pagina: 'ajudar', chave: 'apadrinhamento_descricao', valor: 'Ao apadrinhar um seminarista, contribui mensalmente para cobrir os custos da sua formação (propinas, material escolar, alimentação, alojamento).', tipo: 'text' },
    { pagina: 'ajudar', chave: 'apadrinhamento_beneficios', valor: JSON.stringify(['Recebe cartas e actualizações do seminarista que apoia', 'Participação na missa de ordenação', 'Oração especial do seminarista por si', 'Contribuição a partir de 50.000 Kz/mês']), tipo: 'json' },
    { pagina: 'ajudar', chave: 'email_apadrinhamento', valor: 'info@cristorei.ao', tipo: 'text' },
    { pagina: 'ajudar', chave: 'email_oracao', valor: 'oracao@cristorei.ao', tipo: 'text' },
    { pagina: 'ajudar', chave: 'oracao_texto', valor: 'Envie o seu pedido de oração e os nossos seminaristas orarão por si durante a Missa e a oração comunitária.', tipo: 'text' },

    // Mensagens dos Reitores (Seminário)
    { pagina: 'seminario', chave: 'reitor_teologia_nome', valor: 'Pe. António Lúcio Ferreira', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_teologia_cargo', valor: 'Reitor da Secção de Teologia', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_teologia_citacao', valor: '"A Teologia é a ciência da fé. Aqui formamos homens que pensam com a Igreja e servem o povo de Deus com profundidade intelectual e ardor apostólico."', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_teologia_descricao', valor: 'A Secção de Teologia acolhe os seminaristas que, após concluírem os estudos filosóficos, avançam para a formação teológica específica que os prepara para o presbiterado. O percurso académico dura quatro anos e culmina com a ordenação diaconal e sacerdotal.', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_filosofia_nome', valor: 'Pe. Carlos Eduardo Neto', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_filosofia_cargo', valor: 'Reitor da Secção de Filosofia', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_filosofia_citacao', valor: '"A Filosofia forma homens que interrogam, que pensam, que buscam a verdade. É o alicerce indispensável sobre o qual se edificará toda a formação teológica."', tipo: 'text' },
    { pagina: 'seminario', chave: 'reitor_filosofia_descricao', valor: 'A Secção de Filosofia é o primeiro grau da formação seminarística no Seminário Maior. Os candidatos ao sacerdócio iniciam aqui o seu percurso, adquirindo os fundamentos filosóficos, humanísticos e espirituais necessários para os estudos teológicos subsequentes. O curso tem a duração de três anos.', tipo: 'text' },

    // Deus Chama-me? (Vocação)
    { pagina: 'vocacao', chave: 'hero_subtitulo', valor: 'Se sentes um chamamento interior para servir a Deus como sacerdote, esta página é para ti. Descobre mais sobre a vocação sacerdotal e como discernir.', tipo: 'text' },
    { pagina: 'vocacao', chave: 'testemunhos', valor: JSON.stringify([
      { nome: 'Pe. Carlos Neto', ano: 'Ordenado em 2018', texto: '"Entrei no seminário com muitas dúvidas, mas a comunidade e a oração ajudaram-me a perceber que era mesmo este o meu caminho."' },
      { nome: 'Pe. Manuel Silva', ano: 'Ordenado em 2020', texto: '"Os sete anos de formação moldaram-me como homem e como sacerdote. Aprendi a escutar Deus no silêncio e nos outros."' },
      { nome: 'Pe. João Paulo Dias', ano: 'Ordenado em 2022', texto: '"O Seminário de Cristo Rei é uma escola de humanidade. Formação não é apenas estudo — é transformação interior."' },
    ]), tipo: 'json' },
    { pagina: 'vocacao', chave: 'faqs', valor: JSON.stringify([
      { q: 'Como sei se tenho vocação sacerdotal?', a: 'A vocação manifesta-se através de um desejo persistente de servir a Deus e à Igreja, amor pela Eucaristia e pelos sacramentos, e o desejo de acompanhar espiritualmente as pessoas. Fala com o teu pároco ou um sacerdote de confiança.' },
      { q: 'Que requisitos são necessários para entrar no Seminário?', a: 'É necessário ser do sexo masculino, católico praticante, ter concluído o ensino secundário, ter boa saúde física e psicológica, e apresentar carta de recomendação do pároco.' },
      { q: 'Quantos anos dura a formação?', a: 'A formação no Seminário Maior dura 7 anos: Filosofia (3 anos) e Teologia (4 anos), culminando com a ordenação diaconal e presbiteral.' },
      { q: 'Posso visitar o Seminário antes de me candidatar?', a: 'Sim! Organizamos fins-de-semana vocacionais e dias abertos. Entre em contacto connosco para agendar uma visita.' },
      { q: 'Como se faz a candidatura?', a: 'A candidatura é feita através do formulário disponível na diocese ou directamente no Seminário, entre Junho e Agosto de cada ano.' },
    ]), tipo: 'json' },

    // Comunidade
    { pagina: 'comunidade', chave: 'vida_comunitaria', valor: JSON.stringify([
      { titulo: 'Oração Comum', desc: 'Começamos cada dia com a Liturgia das Horas e a Santa Missa, o centro da vida do Seminário.' },
      { titulo: 'Estudo e Formação', desc: 'Aulas de Filosofia e Teologia, seminários de investigação e leitura espiritual estruturam o dia académico.' },
      { titulo: 'Convívio Fraterno', desc: 'Refeições partilhadas, actividades desportivas e culturais constroem laços de fraternidade duradouros.' },
      { titulo: 'Serviço Pastoral', desc: 'Aos fins-de-semana, os seminaristas participam na pastoral das paróquias da Arquidiocese do Huambo.' },
    ]), tipo: 'json' },
    { pagina: 'comunidade', chave: 'associacoes', valor: JSON.stringify(['Amigos do Seminário', 'Associação Alumni', 'Benefactores da Diocese']), tipo: 'json' },
  ];
  for (const c of conteudos) await PageContent.create(c);

  console.log('\n✓ Base de dados inicializada com sucesso\n');
  console.log('  ── Administração Global ──────────────────────────────');
  console.log('  Super-Admin : admin@cristorei.ao / Admin@1234');
  console.log('\n  ── Secção de Teologia ────────────────────────────────');
  console.log('  Reitor      : reitor.teologia@cristorei.ao / Admin@1234');
  console.log('  Staff 1     : staff.teo1@cristorei.ao / Staff@1234');
  console.log('  Staff 2     : staff.teo2@cristorei.ao / Staff@1234');
  console.log('  Seminaristas: sem.teo1@cristorei.ao … sem.teo8@cristorei.ao / Seminarista@1234');
  console.log('\n  ── Secção de Filosofia ───────────────────────────────');
  console.log('  Reitor      : reitor.filosofia@cristorei.ao / Admin@1234');
  console.log('  Staff 1     : staff.fil1@cristorei.ao / Staff@1234');
  console.log('  Staff 2     : staff.fil2@cristorei.ao / Staff@1234');
  console.log('  Seminaristas: sem.fil1@cristorei.ao … sem.fil6@cristorei.ao / Seminarista@1234\n');

  await sequelize.close();
}

seed().catch(err => { console.error(err); process.exit(1); });
