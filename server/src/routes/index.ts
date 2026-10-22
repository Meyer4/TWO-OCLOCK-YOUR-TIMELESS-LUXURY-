import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes, { paymentMethodsRouter } from './payment.routes.js';
import reviewRoutes from './review.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import couponRoutes from './coupon.routes.js';
import blogRoutes from './blog.routes.js';
import adminRoutes from './admin.routes.js';
import { miscRouter } from './misc.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/payments', paymentMethodsRouter);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/wishlist', wishlistRoutes);
apiRouter.use('/coupons', couponRoutes);
apiRouter.use('/blog', blogRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/', miscRouter);
