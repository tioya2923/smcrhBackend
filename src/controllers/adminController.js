const { Op } = require('sequelize');
const { User, Propina, Payment, Comunicado, Material, Horario } = require('../models');
const { sendComunicado } = require('../services/email');
const logger = require('../utils/logger');

// Helpers
function seccaoFilter(req) {
  // Super-admins (seccao null) vêem tudo; admins de secção vêem apenas a sua
  return req.user.seccao ? { seccao: req.user.seccao } : {};
}

// Maps cargo UI type → permissoes access level
const CARGO_PERMISSOES = {
  seminarista: 'seminarista',
  professor: 'staff',
  funcionario: 'staff',
  direccao: 'admin',
  administrador: 'admin',
};

async function listSeminaristas(req, res) {
  try {
    const { page = 1, search, ano, seccao } = req.query;
    // Show everyone except the super-admin (admin with seccao null)
    const where = {
      [Op.or]: [
        { permissoes: { [Op.in]: ['seminarista', 'staff'] } },
        { permissoes: 'admin', seccao: { [Op.ne]: null } },
      ],
    };
    if (search) where.nome = { [Op.iLike]: `%${search}%` };
    if (ano) where.ano_formacao = ano;

    // Section restriction: admin de secção só vê a sua; super-admin pode filtrar
    if (req.user.seccao) {
      where.seccao = req.user.seccao;
    } else if (seccao) {
      where.seccao = seccao;
    }

    const limit = Math.min(parseInt(req.query.limit) || 25, 500);
    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Propina, as: 'propina' }],
      order: [['cargo', 'ASC'], ['seccao', 'ASC'], ['nome', 'ASC']],
      limit,
      offset: (page - 1) * limit,
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
    // Admin de secção não pode ver utilizadores de outra secção
    if (req.user.seccao && user.seccao !== req.user.seccao) {
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    }
    res.json(user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function createSeminarista(req, res) {
  try {
    const { nome, email, password, ano_formacao, nif, cargo, seccao } = req.body;
    if (!nome || !email || !password) return res.status(400).json({ erro: 'Dados obrigatórios em falta' });
    if (!seccao) return res.status(400).json({ erro: 'Secção obrigatória' });
    if (!cargo) return res.status(400).json({ erro: 'Tipo obrigatório' });

    // Admin de secção só pode criar utilizadores na sua secção
    const seccaoFinal = req.user.seccao || seccao;
    if (req.user.seccao && seccao && req.user.seccao !== seccao) {
      return res.status(403).json({ erro: 'Não pode criar utilizadores nessa secção' });
    }

    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ erro: 'Email já registado' });

    const permissoes = CARGO_PERMISSOES[cargo] || 'seminarista';
    const user = await User.create({
      nome, email: email.toLowerCase(), password_hash: password,
      ano_formacao: cargo === 'seminarista' ? ano_formacao : null,
      permissoes, cargo, seccao: seccaoFinal,
    });
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
    if (req.user.seccao && user.seccao !== req.user.seccao) {
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    }
    const { nome, email, ano_formacao, ativo, cargo, seccao, password } = req.body;
    const updates = { nome, ativo };
    if (email) updates.email = email.toLowerCase();
    // Only super-admin (seccao null) can change section
    if (seccao && !req.user.seccao) updates.seccao = seccao;
    if (cargo) {
      updates.cargo = cargo;
      updates.permissoes = CARGO_PERMISSOES[cargo] || user.permissoes;
      updates.ano_formacao = cargo === 'seminarista' ? (ano_formacao || user.ano_formacao) : null;
    } else if (ano_formacao !== undefined) {
      updates.ano_formacao = ano_formacao;
    }
    if (password && password.length >= 8) updates.password_hash = password;
    await user.update(updates);
    res.json(user.toPublic());
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function deleteSeminarista(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' });
    // Prevent deleting the super-admin account itself
    if (!user.seccao && user.permissoes === 'admin') {
      return res.status(403).json({ erro: 'Não é possível eliminar o administrador global' });
    }
    // Section admins can only delete users of their section
    if (req.user.seccao && user.seccao !== req.user.seccao) {
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    }
    await user.destroy();
    res.json({ mensagem: 'Utilizador eliminado' });
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
    const { titulo, conteudo, destinatarios, seccao } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ erro: 'Título e conteúdo obrigatórios' });

    const seccaoComunicado = req.user.seccao || seccao || 'todas';

    const where = destinatarios === 'todos' ? {} : { permissoes: destinatarios };
    if (seccaoComunicado !== 'todas') where.seccao = seccaoComunicado;

    const users = await User.findAll({ where: { ...where, ativo: true }, attributes: ['email'] });

    const comunicado = await Comunicado.create({
      titulo, conteudo, destinatarios, seccao: seccaoComunicado, autor_id: req.user.id,
    });

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
    let query = `SELECT DATE_TRUNC('month', p.data_pagamento) AS mes, SUM(p.valor) AS total, COUNT(*) AS num_pagamentos
                 FROM payments p`;

    // Juntar users para filtrar por secção
    if (req.user.seccao) {
      query += ` JOIN users u ON p.user_id = u.id WHERE p.confirmado = true AND u.seccao = :seccao`;
    } else {
      query += ` WHERE p.confirmado = true`;
    }
    query += ` GROUP BY mes ORDER BY mes DESC LIMIT 12`;

    const rows = await sequelize.query(query, {
      replacements: { seccao: req.user.seccao },
      type: sequelize.QueryTypes.SELECT,
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function relatorioDevedores(req, res) {
  try {
    const userWhere = req.user.seccao ? { seccao: req.user.seccao } : {};
    const devedores = await Propina.findAll({
      where: { saldo_devedor: { [Op.gt]: 0 } },
      include: [{ model: User, as: 'user', attributes: ['id', 'nome', 'email', 'ano_formacao', 'seccao'], where: userWhere }],
      order: [['saldo_devedor', 'DESC']],
    });
    res.json(devedores);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getPagamentos(req, res) {
  try {
    const { page = 1, desde, ate, seccao } = req.query;
    const where = { confirmado: true };
    if (desde || ate) {
      where.data_pagamento = {};
      if (desde) where.data_pagamento[Op.gte] = new Date(desde);
      if (ate) where.data_pagamento[Op.lte] = new Date(ate);
    }
    const userWhere = {};
    if (req.user.seccao) userWhere.seccao = req.user.seccao;
    else if (seccao) userWhere.seccao = seccao;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['nome', 'email', 'seccao'], where: userWhere }],
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
    const { titulo, descricao, tipo, ano_formacao, seccao } = req.body;
    const seccaoMaterial = req.user.seccao || seccao || null;
    const material = await Material.create({
      titulo, descricao, tipo: tipo || 'documento',
      ano_formacao: ano_formacao ? parseInt(ano_formacao) : null,
      seccao: seccaoMaterial,
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
    const sf = req.user.seccao ? { seccao: req.user.seccao } : {};

    // Helper: count users by cargo, falling back to permissoes for legacy rows without cargo
    const countCargo = (cargo, permissoesFallback, extraWhere = {}) => User.count({
      where: {
        ativo: true,
        ...sf,
        ...extraWhere,
        [Op.or]: [
          { cargo },
          ...(permissoesFallback ? [{ cargo: null, permissoes: permissoesFallback }] : []),
        ],
      },
    });

    const [
      totalSeminaristas,
      totalProfessores,
      totalFuncionarios,
      totalDireccao,
      totalAdministradores,
      teoCount,
      filCount,
      totalPago,
      totalDevedor,
    ] = await Promise.all([
      countCargo('seminarista', 'seminarista'),
      countCargo('professor', null),
      countCargo('funcionario', 'staff'),
      countCargo('direccao', null),
      countCargo('administrador', null, { seccao: { [Op.ne]: null } }),
      req.user.seccao ? 0 : User.count({ where: { ativo: true, [Op.or]: [{ cargo: 'seminarista' }, { cargo: null, permissoes: 'seminarista' }], seccao: 'teologia' } }),
      req.user.seccao ? 0 : User.count({ where: { ativo: true, [Op.or]: [{ cargo: 'seminarista' }, { cargo: null, permissoes: 'seminarista' }], seccao: 'filosofia' } }),
      req.user.seccao
        ? Payment.sum('valor', { where: { confirmado: true }, include: [{ model: User, as: 'user', where: { seccao: req.user.seccao }, attributes: [] }] })
        : Payment.sum('valor', { where: { confirmado: true } }),
      req.user.seccao
        ? Propina.sum('saldo_devedor', { include: [{ model: User, as: 'user', where: { seccao: req.user.seccao }, attributes: [] }] })
        : Propina.sum('saldo_devedor'),
    ]);

    res.json({
      total_seminaristas: totalSeminaristas,
      total_professores: totalProfessores,
      total_funcionarios: totalFuncionarios,
      total_direccao: totalDireccao,
      total_administradores: totalAdministradores,
      seminaristas_teologia: teoCount,
      seminaristas_filosofia: filCount,
      total_pago: totalPago || 0,
      total_devedor: totalDevedor || 0,
      seccao: req.user.seccao || null,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = {
  listSeminaristas, getSeminarista, createSeminarista, updateSeminarista, deleteSeminarista,
  aplicarBolsa, configurarPropina, enviarComunicado,
  relatorioArrecadacao, relatorioDevedores, getPagamentos,
  uploadMaterial, getStats,
};
