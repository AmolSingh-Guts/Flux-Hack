import morgan from 'morgan';
import env from '../config/env.js';

const format = env.isProduction ? 'combined' : 'dev';

export default morgan(format);
