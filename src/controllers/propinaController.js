const { v4: uuidv4 } = require('uuid');
const { Propina, Payment, User } = require('../models');
const { createPaymentIntent } = require('../services/stripe');
const { generateRecibo } = require('../services/pdf');
const { sendPaymentConfirmation } = require('../services/email');
const logger = require('../utils/logger');

async function getMinhaDivida(req, res) {
  try {
    const propina = await Propina.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: Payment,
        as: 'payments',
        where: { confirmado: true },
        required: false,
        order: [['data_pagamento', 'DESC']],
        limit: 12,
      }],
    });

    if (!propina) {
      return res.status(404).json({ erro: 'Propina não configurada. Contacte a administração.' });
    }

    const desconto = propina.bolsa ? propina.desconto_percentagem : 0;
    const montante_efectivo = propina.montante_mensal * (1 - desconto / 100);

    res.json({
      montante_mensal: propina.montante_mensal,
      montante_efectivo,
      moeda: propina.moeda,
      data_vencimento: propina.data_vencimento,
      saldo_devedor: propina.saldo_devedor,
      bolsa: propina.bolsa,
      desconto_percentagem: propina.desconto_percentagem,
      pagamentos: propina.payments,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function iniciarPagamento(req, res) {
  try {
    const { valor, metodo, periodo_referencia } = req.body;
    if (!valor || valor <= 0) return res.status(400).json({ erro: 'Valor inválido' });

    const propina = await Propina.findOne({ where: { user_id: req.user.id } });
    if (!propina) return res.status(404).json({ erro: 'Propina não encontrada' });

    if (metodo === 'cartao') {
      const intent = await createPaymentIntent({
        amount: valor,
        currency: propina.moeda === 'AOA' ? 'eur' : propina.moeda.toLowerCase(),
        metadata: { user_id: req.user.id, propina_id: propina.id, periodo: periodo_referencia },
      });

      const payment = await Payment.create({
        user_id: req.user.id,
        propina_id: propina.id,
        valor,
        moeda: propina.moeda,
        metodo: 'cartao',
        referencia_transacao: uuidv4(),
        stripe_payment_intent_id: intent.id,
        periodo_referencia,
        confirmado: false,
      });

      return res.json({ client_secret: intent.client_secret, payment_id: payment.id });
    }

    const ref = `MB${Date.now()}`;
    const payment = await Payment.create({
      user_id: req.user.id,
      propina_id: propina.id,
      valor,
      moeda: propina.moeda,
      metodo: metodo || 'multibanco',
      referencia_transacao: ref,
      periodo_referencia,
      confirmado: false,
    });

    res.json({ referencia: ref, payment_id: payment.id, mensagem: 'Use esta referência para efectuar o pagamento.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function confirmarPagamento(req, res) {
  try {
    const { payment_id, payment_intent_id } = req.body;

    const payment = await Payment.findOne({ where: { id: payment_id, user_id: req.user.id } });
    if (!payment) return res.status(404).json({ erro: 'Pagamento não encontrado' });
    if (payment.confirmado) return res.json({ mensagem: 'Já confirmado' });

    await payment.update({ confirmado: true, data_pagamento: new Date() });

    const propina = await Propina.findByPk(payment.propina_id);
    if (propina) {
      const novo_saldo = Math.max(0, parseFloat(propina.saldo_devedor) - parseFloat(payment.valor));
      await propina.update({ saldo_devedor: novo_saldo });
    }

    await sendPaymentConfirmation(req.user, payment).catch(() => {});
    logger.info('Payment confirmed', { payment_id, user_id: req.user.id });

    res.json({ mensagem: 'Pagamento confirmado', payment: payment.toJSON() });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function getRecibos(req, res) {
  try {
    const payments = await Payment.findAll({
      where: { user_id: req.user.id, confirmado: true },
      order: [['data_pagamento', 'DESC']],
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function downloadRecibo(req, res) {
  try {
    const payment = await Payment.findOne({
      where: { id: req.params.id, user_id: req.user.id, confirmado: true },
    });
    if (!payment) return res.status(404).json({ erro: 'Recibo não encontrado' });

    const pdfBuffer = await generateRecibo(payment, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo-${payment.id.substring(0, 8)}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function pedirProrrogacao(req, res) {
  try {
    const { motivo, data_pretendida } = req.body;
    if (!motivo) return res.status(400).json({ erro: 'Motivo obrigatório' });
    logger.info('Prorrogacao requested', { user_id: req.user.id, motivo });
    res.json({ mensagem: 'Pedido de prorrogação enviado à administração.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = { getMinhaDivida, iniciarPagamento, confirmarPagamento, getRecibos, downloadRecibo, pedirProrrogacao };
