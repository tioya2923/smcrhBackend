const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  listSeminaristas, getSeminarista, createSeminarista, updateSeminarista, deleteSeminarista,
  aplicarBolsa, configurarPropina, enviarComunicado,
  relatorioArrecadacao, relatorioDevedores, getPagamentos,
  uploadMaterial, getStats,
} = require('../controllers/adminController');
const {
  upsertPagina, upsertConteudo,
  getEquipa, createMembro, updateMembro, deleteMembro,
  listNoticias, getNoticia, createNoticia, updateNoticia, deleteNoticia,
  listEventos, createEvento, updateEvento, deleteEvento,
} = require('../controllers/conteudoController');

router.use(authenticate, authorize('admin', 'staff'));

// ── Seminaristas ─────────────────────────────────────────────────────────────
router.get('/stats', getStats);
router.get('/seminaristas', listSeminaristas);
router.get('/seminarista/:id', getSeminarista);
router.post('/seminarista', authorize('admin'), createSeminarista);
router.put('/seminarista/:id', updateSeminarista);
router.delete('/seminarista/:id', authorize('admin'), deleteSeminarista);
router.post('/seminarista/:id/bolsa', authorize('admin'), aplicarBolsa);
router.post('/seminarista/:id/propina', configurarPropina);

// ── Comunicados e Materiais ───────────────────────────────────────────────────
router.post('/comunicado', enviarComunicado);
router.post('/material', upload.single('ficheiro'), uploadMaterial);

// ── Pagamentos e Relatórios ───────────────────────────────────────────────────
router.get('/pagamentos', getPagamentos);
router.post('/propina/config', authorize('admin'), configurarPropina);
router.get('/relatorios/arrecadacao', relatorioArrecadacao);
router.get('/relatorios/devedores', relatorioDevedores);

// ── Upload de imagens ─────────────────────────────────────────────────────────
router.post('/upload/imagem', (req, res, next) => {
  upload.single('imagem')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ erro: err.message || 'Erro ao processar imagem' });
    }
    if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// ── Conteúdo de páginas ───────────────────────────────────────────────────────
router.put('/conteudo', authorize('admin'), upsertPagina);
router.put('/conteudo/campo', authorize('admin'), upsertConteudo);

// ── Equipa Formadora ──────────────────────────────────────────────────────────
router.get('/equipa', getEquipa);
router.post('/equipa', authorize('admin'), createMembro);
router.put('/equipa/:id', authorize('admin'), updateMembro);
router.delete('/equipa/:id', authorize('admin'), deleteMembro);

// ── Notícias ──────────────────────────────────────────────────────────────────
router.get('/noticias', listNoticias);
router.get('/noticias/:id', getNoticia);
router.post('/noticias', createNoticia);
router.put('/noticias/:id', updateNoticia);
router.delete('/noticias/:id', authorize('admin'), deleteNoticia);

// ── Eventos ───────────────────────────────────────────────────────────────────
router.get('/eventos', listEventos);
router.post('/eventos', createEvento);
router.put('/eventos/:id', updateEvento);
router.delete('/eventos/:id', authorize('admin'), deleteEvento);

module.exports = router;
