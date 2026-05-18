const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  listSeminaristas, getSeminarista, createSeminarista, updateSeminarista,
  aplicarBolsa, configurarPropina, enviarComunicado,
  relatorioArrecadacao, relatorioDevedores, getPagamentos,
  uploadMaterial, getStats,
} = require('../controllers/adminController');

router.use(authenticate, authorize('admin', 'staff'));

router.get('/stats', getStats);

router.get('/seminaristas', listSeminaristas);
router.get('/seminarista/:id', getSeminarista);
router.post('/seminarista', authorize('admin'), createSeminarista);
router.put('/seminarista/:id', updateSeminarista);
router.post('/seminarista/:id/bolsa', authorize('admin'), aplicarBolsa);
router.post('/seminarista/:id/propina', configurarPropina);

router.post('/comunicado', enviarComunicado);
router.post('/material', upload.single('ficheiro'), uploadMaterial);

router.get('/pagamentos', getPagamentos);
router.post('/propina/config', authorize('admin'), configurarPropina);

router.get('/relatorios/arrecadacao', relatorioArrecadacao);
router.get('/relatorios/devedores', relatorioDevedores);

module.exports = router;
