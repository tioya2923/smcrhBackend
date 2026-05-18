const { Op } = require('sequelize');
const { User, Propina, Payment, Comunicado, Material, Horario } = require('../models');
const { sendComunicado } = require('../services/email');
const logger = require('../utils/logger');

async function listSeminaristas(req, res) {
  try {
    const { page = 1, search, ano } = req.query;
    const where = { permissoes: 'seminarista' };
    if (search) where.nome = { [Op.iLike]: `%${search}%` };
    if (ano) where.ano_formacao = ano;

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Propina, as: 'propina' }],
      order: [['nome', 'ASC']],
      limit: 25,
      offset: (page - 1) * 25,
    });
    res.json({ total: count, pagina: parseInt(page), seminaristas: rows.map(u => u.toPublic()) });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getSeminarista(req, res) {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Propina, as: 'propina', include: [{ model: Payment, as: 'payments', limit: 20, order: [['data_pagamento', 'DESC']] }] },
      ],
    });
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    res.json(user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function createSeminarista(req, res) {
  try {
    const { nome, email, password, ano_formacao, nif, permissoes } = req.body;
    if (!nome || !email || !password) return res.status(400).json({ erro: 'Dados obrigatórios em falta' });

    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ erro: 'Email já registado' });

    const user = await User.create({ nome, email: email.toLowerCase(), password_hash: password, ano_formacao, permissoes: permissoes || 'seminarista' });
    if (nif) { user.setNif(nif); await user.save(); }

    const { sendWelcome } = require('../services/email');
    await sendWelcome(user).catch(() => {});
    res.status(201).json(user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function updateSeminarista(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    const { nome, ano_formacao, ativo, permissoes } = req.body;
    await user.update({ nome, ano_formacao, ativo, permissoes });
    res.json(user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function aplicarBolsa(req, res) {
  try {
    const { desconto_percentagem, bolsa } = req.body;
    const propina = await Propina.findOne({ where: { user_id: req.params.id } });
    if (!propina) return res.status(404).json({ erro: 'Propina não encontrada' });
    await propina.update({ bolsa, desconto_percentagem });
    res.json(propina);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function configurarPropina(req, res) {
  try {
    const { user_id, montante_mensal, moeda, data_vencimento } = req.body;
    const [propina] = await Propina.findOrCreate({
      where: { user_id },
      defaults: { montante_mensal: montante_mensal || 50000, moeda: moeda || 'AOA', data_vencimento, saldo_devedor: 0 },
    });
    if (montante_mensal) await propina.update({ montante_mensal, moeda, data_vencimento });
    res.json(propina);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function enviarComunicado(req, res) {
  try {
    const { titulo, conteudo, destinatarios } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ erro: 'Título e conteúdo obrigatórios' });

    const where = destinatarios === 'todos' ? {} : { permissoes: destinatarios };
    const users = await User.findAll({ where: { ...where, ativo: true }, attributes: ['email'] });

    const comunicado = await Comunicado.create({ titulo, conteudo, destinatarios, autor_id: req.user.id });

    const emails = users.map(u => u.email);
    await sendComunicado(emails, titulo, conteudo).catch(() => {});
    await comunicado.update({ enviado_email: true });

    res.status(201).json({ mensagem: `Comunicado enviado para ${emails.length} utilizadores`, comunicado });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function relatorioArrecadacao(req, res) {
  try {
    const { sequelize } = require('../models');
    const rows = await sequelize.query(
      `SELECT DATE_TRUNC('month', data_pagamento) AS mes, SUM(valor) AS total, COUNT(*) AS num_pagamentos
       FROM payments WHERE confirmado = true
       GROUP BY mes ORDER BY mes DESC LIMIT 12`,
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function relatorioDevedores(req, res) {
  try {
    const devedores = await Propina.findAll({
      where: { saldo_devedor: { [Op.gt]: 0 } },
      include: [{ model: User, as: 'user', attributes: ['id', 'nome', 'email', 'ano_formacao'] }],
      order: [['saldo_devedor', 'DESC']],
    });
    res.json(devedores);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getPagamentos(req, res) {
  try {
    const { page = 1, desde, ate } = req.query;
    const where = { confirmado: true };
    if (desde || ate) {
      where.data_pagamento = {};
      if (desde) where.data_pagamento[Op.gte] = new Date(desde);
      if (ate) where.data_pagamento[Op.lte] = new Date(ate);
    }
    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['nome', 'email'] }],
      order: [['data_pagamento', 'DESC']],
      limit: 30,
      offset: (page - 1) * 30,
    });
    res.json({ total: count, pagina: parseInt(page), pagamentos: rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function uploadMaterial(req, res) {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum ficheiro enviado' });
    const { titulo, descricao, tipo, ano_formacao } = req.body;
    const material = await Material.create({
      titulo, descricao, tipo: tipo || 'documento',
      ano_formacao: ano_formacao ? parseInt(ano_formacao) : null,
      ficheiro_url: `/uploads/${req.file.filename}`,
      enviado_por: req.user.id,
      tamanho_bytes: req.file.size,
    });
    res.status(201).json(material);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getStats(req, res) {
  try {
    const [totalSeminaristas, totalPago, totalDevedor] = await Promise.all([
      User.count({ where: { permissoes: 'seminarista', ativo: true } }),
      Payment.sum('valor', { where: { confirmado: true } }),
      Propina.sum('saldo_devedor'),
    ]);
    res.json({ total_seminaristas: totalSeminaristas, total_pago: totalPago || 0, total_devedor: totalDevedor || 0 });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = {
  listSeminaristas, getSeminarista, createSeminarista, updateSeminarista,
  aplicarBolsa, configurarPropina, enviarComunicado,
  relatorioArrecadacao, relatorioDevedores, getPagamentos,
  uploadMaterial, getStats,
};
