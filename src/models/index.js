const sequelize = require('../config/database');
const User = require('./User');
const Propina = require('./Propina');
const Payment = require('./Payment');
const News = require('./News');
const Event = require('./Event');
const Comunicado = require('./Comunicado');
const Material = require('./Material');
const Horario = require('./Horario');
const AuditLog = require('./AuditLog');
const ForumPost = require('./ForumPost');

// Associations
User.hasOne(Propina, { foreignKey: 'user_id', as: 'propina' });
Propina.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Propina.hasMany(Payment, { foreignKey: 'propina_id', as: 'payments' });
Payment.belongsTo(Propina, { foreignKey: 'propina_id', as: 'propina' });

User.hasMany(News, { foreignKey: 'autor_id', as: 'noticias' });
News.belongsTo(User, { foreignKey: 'autor_id', as: 'autor' });

User.hasMany(ForumPost, { foreignKey: 'autor_id', as: 'posts' });
ForumPost.belongsTo(User, { foreignKey: 'autor_id', as: 'autor' });

ForumPost.hasMany(ForumPost, { foreignKey: 'parent_id', as: 'respostas' });
ForumPost.belongsTo(ForumPost, { foreignKey: 'parent_id', as: 'parent' });

module.exports = {
  sequelize,
  User,
  Propina,
  Payment,
  News,
  Event,
  Comunicado,
  Material,
  Horario,
  AuditLog,
  ForumPost,
};
