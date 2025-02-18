const express = require('express')
const router = express.Router();
const cloudinary = require('../config/cloudinaryConfig');
const { multerUpload } = require('../config/multerConfig');

// controllers
const { login, loadLogin, loadUsers, deleteUser, blockUser, viewUser, logout } = require("../controllers/adminController/adminController");
const { loadCategories, addCatgeory, deleteCategory, editCategory, } = require("../controllers/adminController/categoryController");
const { loadAddProductpage, addProduct, loadProducts, loadProductViewpage,
     loadEditProductpage, editProduct, deleteProduct, updateProductStock } = require('../controllers/adminController/productController')
const { loadOrders, updateOrder, updateProductStatus, cancelAll, ChangeDeliveryDate, reutrnApproval } = require('../controllers/adminController/orderController')
const { getCoupons, createCoupon, loadAddCoupons, loadEditCoupon, updateCoupon, deleteCoupon } = require('../controllers/adminController/couponController')
const { getOfferPage, referralUpdation, addCategoryOffer, editCategoryOffer, deleteCategoryOffer } = require('../controllers/adminController/offerController');
const { getSalesReport, fetchAllOrders } = require('../controllers/adminController/salesController')
const { loadDashboard } = require('../controllers/adminController/dashboardController')
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
router.post('/return/approve', authsession, reutrnApproval)


// Coupon Management
router.get('/coupons', authsession, getCoupons);
router.get('/coupons/add', authsession, loadAddCoupons);
router.post('/coupons', authsession, createCoupon);
router.get('/coupons/:id/edit', authsession, loadEditCoupon);
router.post('/coupons/:id', authsession, updateCoupon);
router.post('/coupons/:id/delete', authsession, deleteCoupon);

// offer Management
router.get('/offers', authsession, getOfferPage);
router.post('/referral-bonus-change', authsession, referralUpdation)
router.post('/category-offer', authsession, addCategoryOffer)
router.delete('/category-offer/:id', authsession, deleteCategoryOffer)
router.put('/category-offer/:id', authsession, editCategoryOffer)

// sales report

router.get('/sales-report', authsession, getSalesReport)
router.get('/orders/report', authsession, fetchAllOrders);

   
module.exports = router