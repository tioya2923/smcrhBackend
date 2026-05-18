const router = require('express').Router();
const { apiLimiter } = require('../middleware/rateLimit');
const { getNoticias, getNoticia, getEventos, submitContacto, criarDonativo } = require('../controllers/publicController');

router.use(apiLimiter);

router.get('/noticias', getNoticias);
router.get('/noticias/:id', getNoticia);
router.get('/eventos', getEventos);
router.post('/contacto/formulario', submitContacto);
router.post('/donativos/criar', criarDonativo);

module.exports = router;
