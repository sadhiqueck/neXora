const express = require('express')
const router = express.Router();
const cloudinary = require('../config/cloudinaryConfig');
const { multerUpload } = require('../config/multerConfig');

// controllers
const { login, loadLogin, loadDashboard, loadUsers, deleteUser, blockUser, viewUser, logout } = require("../controllers/adminController/adminController");
const { loadCategories, addCatgeory, deleteCategory, editCategory, } = require("../controllers/adminController/categoryController");
const { loadAddProductpage, addProduct, loadProducts, loadProductViewpage,
     loadEditProductpage, editProduct, deleteProduct, updateProductStock } = require('../controllers/adminController/productController')
const { loadOrders, updateOrder, updateProductStatus, cancelAll, ChangeDeliveryDate } = require('../controllers/adminController/orderController')
const { getCoupons, createCoupon, loadAddCoupons, loadEditCoupon, updateCoupon, deleteCoupon, getReferrals } = require('../controllers/adminController/couponController')
// middlewares
const { authsession, isLogin } = require('../middleware/adminAuth')
const { validateStockUpdate } = require('../middleware/stockValidation')




router.get('/login', isLogin, loadLogin)

router.get('/dashboard', authsession, loadDashboard)


router.post('/login', login)

router.post('/logout', authsession, logout)

// user management
router.get('/users', authsession, loadUsers)
router.get('/delete-user/:id', authsession, deleteUser)
router.get('/block-user/:id', authsession, blockUser)
router.get('/view-user/:id', authsession, viewUser)

// catgeory management

router.get('/delete-category/:id', authsession, deleteCategory)
router.get('/category', authsession, loadCategories)
router.post('/add-category', authsession, addCatgeory)
router.post('/edit-category', authsession, editCategory)


// product Management
router.get('/products', authsession, loadProducts)
router.get('/add-products', authsession, loadAddProductpage)
router.post('/add-product', authsession, validateStockUpdate, multerUpload, addProduct)
router.get('/product/:id', authsession, loadProductViewpage)
router.get('/product/:id/edit', authsession, loadEditProductpage)
router.put('/product/edit/:id', authsession, validateStockUpdate, multerUpload, editProduct)
router.get('/delete-product/:id', authsession, deleteProduct)
// stock upation
router.put('/product/update-stock/:id', authsession, updateProductStock)



// ordermanagement

router.get('/orders', authsession, loadOrders)
router.get('/order-update/:orderId', authsession, updateOrder);
router.post('/orders/update-product-status', authsession, updateProductStatus)
router.post('/orders/cancel-all', authsession, cancelAll)
router.post('/orders/date-change', authsession, ChangeDeliveryDate)


// Coupon Management
router.get('/coupons', getCoupons);
router.get('/coupons/add', loadAddCoupons);
router.post('/coupons', createCoupon);
router.get('/coupons/:id/edit', loadEditCoupon);
router.post('/coupons/:id', updateCoupon);
router.post('/coupons/:id/delete', deleteCoupon);

// Referral Management
router.get('/referrals', getReferrals);

module.exports = router