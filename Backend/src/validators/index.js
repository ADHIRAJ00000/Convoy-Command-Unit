const Joi = require('joi');

/**
 * Validate request body against Joi schema
 */
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }
    
    next();
  };
}

/**
 * Convoy validation schemas
 */
const convoySchemas = {
  create: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    origin: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      name: Joi.string()
    }).required(),
    destination: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      name: Joi.string()
    }).required(),
    vehicleCount: Joi.number().integer().min(1).required(),
    unitType: Joi.string().valid('ARMY', 'AIRFORCE', 'NAVY', 'PARAMILITARY', 'LOGISTICS', 'MEDICAL').required(),
    priority: Joi.string().valid('ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'),
    speedKmph: Joi.number().min(0).max(120),
    commander: Joi.object({
      name: Joi.string(),
      rank: Joi.string(),
      contact: Joi.string()
    })
  }),
  
  updatePosition: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
    speed: Joi.number().min(0).max(120)
  })
};

/**
 * Event validation schemas
 */
const eventSchemas = {
  create: Joi.object({
    type: Joi.string().valid(
      'CHECKPOINT_LOG', 'DELAY', 'CONFLICT', 'WEATHER_ALERT', 
      'ROUTE_CHANGE', 'INCIDENT', 'BLOCKAGE', 'EMERGENCY'
    ).required(),
    convoyId: Joi.string().required(),
    severity: Joi.string().valid('INFO', 'WARNING', 'CRITICAL'),
    title: Joi.string().required(),
    description: Joi.string(),
    location: Joi.object({
      lat: Joi.number(),
      lng: Joi.number(),
      name: Joi.string()
    })
  })
};

/**
 * Auth validation schemas
 */
const authSchemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    rank: Joi.string(),
    unit: Joi.string(),
    role: Joi.string().valid('ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER')
  }),
  
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  })
};

module.exports = {
  validate,
  convoySchemas,
  eventSchemas,
  authSchemas
};
