require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User, Propina, News, Event, Horario } = require('../models');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  console.log('Seeding database...');

  // Admin user
  const admin = await User.create({
    nome: 'Pe. António Seminarista',
    email: 'admin@cristorei.ao',
    password_hash: 'Admin@1234',
    permissoes: 'admin',
    ativo: true,
  });

  // Staff
  const staff = await User.create({
    nome: 'Maria Formadora',
    email: 'staff@cristorei.ao',
    password_hash: 'Staff@1234',
    permissoes: 'staff',
    ativo: true,
  });

  // Seminaristas
  const seminaristas = [];
  const nomes = ['João Paulo Neto', 'Pedro António Silva', 'Manuel Costa Dias', 'Filipe Augusto Lopes', 'Carlos Eduardo Ferreira'];
  for (let i = 0; i < nomes.length; i++) {
    const s = await User.create({
      nome: nomes[i],
      email: `seminarista${i + 1}@cristorei.ao`,
      password_hash: 'Seminarista@1234',
      permissoes: 'seminarista',
      ano_formacao: (i % 6) + 1,
      data_entrada: new Date(2020 + i, 8, 1),
      ativo: true,
    });
    await Propina.create({
      user_id: s.id,
      montante_mensal: 50000,
      moeda: 'AOA',
      data_vencimento: new Date(2026, 4, 15),
      saldo_devedor: i % 2 === 0 ? 50000 : 0,
      bolsa: i === 2,
      desconto_percentagem: i === 2 ? 50 : 0,
    });
    seminaristas.push(s);
  }

  // News
  const newsData = [
    { titulo: 'Ordenação sacerdotal de novos presbíteros', categoria: 'eventos', destaque: true, resumo: 'Com grande alegria, o Seminário celebra...', conteudo: '<p>Com grande alegria, o Seminário Maior de Cristo Rei celebra a ordenação de três novos sacerdotes para a Diocese do Huambo.</p>' },
    { titulo: 'Início do ano académico 2025/2026', categoria: 'academico', destaque: true, resumo: 'O novo ano lectivo começa com 45 seminaristas...', conteudo: '<p>Com grande entusiasmo, o Seminário abre as suas portas a um novo ano de formação integral.</p>' },
    { titulo: 'Visita pastoral do Sr. Bispo', categoria: 'comunidade', destaque: false, resumo: 'O Bispo presidiu à Eucaristia dominical...', conteudo: '<p>O Sr. Bispo visitou a comunidade seminarística e presidiu à celebração eucarística dominical.</p>' },
  ];
  for (const n of newsData) {
    await News.create({ ...n, autor_id: admin.id, publicado: true, data_publicacao: new Date(), slug: n.titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') });
  }

  // Events
  await Event.create({ titulo: 'Festa de Cristo Rei', descricao: 'Celebração solenéssima do Padroeiro', data_inicio: new Date(2026, 10, 22), tipo: 'liturgico', publico: true, criado_por: admin.id });
  await Event.create({ titulo: 'Exames do 1.º Semestre', descricao: 'Período de avaliações académicas', data_inicio: new Date(2026, 0, 15), data_fim: new Date(2026, 0, 31), tipo: 'academico', publico: false, criado_por: staff.id });

  // Horários
  const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const disciplinas = ['Filosofia', 'Teologia Fundamental', 'Sagrada Escritura', 'Patrística', 'Liturgia', 'Moral'];
  for (let ano = 1; ano <= 6; ano++) {
    for (let i = 0; i < 3; i++) {
      await Horario.create({
        ano_formacao: ano,
        dia_semana: dias[i % dias.length],
        hora_inicio: `0${8 + i}:00`,
        hora_fim: `0${9 + i}:30`,
        disciplina: disciplinas[(ano + i) % disciplinas.length],
        professor: 'Pe. ' + ['João', 'António', 'Manuel'][i],
        sala: `Sala ${ano * 10 + i}`,
      });
    }
  }

  console.log('✓ Database seeded successfully');
  console.log('  Admin: admin@cristorei.ao / Admin@1234');
  console.log('  Staff: staff@cristorei.ao / Staff@1234');
  console.log('  Seminaristas: seminarista1@cristorei.ao ... seminarista5@cristorei.ao / Seminarista@1234');
  await sequelize.close();
}

seed().catch(err => { console.error(err); process.exit(1); });
