const Wishlist = require('../../models/wishListModel');
const products = require('../../models/productModel');
const Users = require('../../models/userModel');
const Cart= require('../../models/cartModel')

const getWishlist = async (req, res) => {
    try {
     
      const userId = req.session.user._id;
  
      const wishlist = await Wishlist.findOne({ user: userId })
        .populate({
          path: 'products.product',
          select: 'productName price discountedPrice images discount isDeleted totalStock variants',
          match: { isDeleted: false }
        })
        .lean();

      if (!wishlist) {
        return res.render('user/wishlist', {
          wishlist: { products: [] },
          title: "Wishlist"
        });
      }
  
      const userCart = await Cart.findOne({ userId }).lean();
      const cartProductIds = new Set(userCart?.products.map(item => item.productId.toString()) || []);
  
      const processedProducts = wishlist.products
        .filter(item => item.product !== null) 
        .map(item => {
          const product = item.product;
  
          // Filter active variants
          const activeVariants = product.variants?.filter(variant => 
            variant.status === 'active' && variant.stock > 0
          ) || [];
  
          return {
            ...item,
            product: {
              ...product,
              activeVariants,
              inCart: cartProductIds.has(product._id.toString())
            }
          };
        });
  
      res.render('user/wishlist', {
        wishlist: { products: processedProducts },
        title: "Wishlist"
      });
  
    } catch (error) {
      console.error('Wishlist Error:', error);
      res.status(500).render('error', {
        title: "Error",
        message: "Unable to load wishlist"
      });
    }
  };


const addToWishlist = async (req, res) => {

    try {
        const wishlist = await Wishlist.findOneAndUpdate(
            { user: req.user.id },
            { $addToSet: { products: { product: req.params.productId } } },
            { new: true, upsert: true }
        ).populate('products.product');

        res.status(200).json({success:true});
    } catch (err) {
        res.status(500).send('Server error');
    }
}

const removeFromWishlist= async (req, res) => {
    try {
      const wishlist = await Wishlist.findOneAndUpdate(
        { user: req.user.id },
        { $pull: { products: { product: req.params.productId } } },
        { new: true }
      ).populate('products.product');
      
      res.json(wishlist?.products || []);
    } catch (err) {
      res.status(500).send('Server error');
    }
}


const moveAllToCart = async (req, res) => {
    try {
        const userId = req.session.user._id;
        
        const wishlist = await Wishlist.findOne({ user: userId })
            .populate({
                path: 'products.product',
                select: 'productName price discountedPrice images discount isDeleted variants',
                match: { isDeleted: false }
            })
            .lean();

        if (!wishlist || wishlist.products.length === 0) {
            return res.status(400).json({ message: 'Wishlist is empty' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        let productsAdded = 0;

        for (const wishlistItem of wishlist.products) {
            if (!wishlistItem.product) continue;

            const product = await products.findById(wishlistItem.product._id);
            if (!product) continue;

         
            const variant = product.variants.find(variant =>
                variant.status === 'active' && variant.stock > 0
            );

            if (!variant) continue; 

           
            const existingProduct = cart.products.find(
                item => item.productId.toString() === product._id.toString() &&
                    item.variantDetails.color === variant.color &&
                    item.variantDetails.storage === `${variant.storage}${variant.storageUnit}`
            );

          
            if (existingProduct) continue;

     
            const variantDetails = {
                color: variant.color,
                additionalPrice: variant.additionalPrice || 0,
            };

            if (variant.storage !== null && variant.storageUnit !== 'NIL') {
                variantDetails.storage = `${variant.storage}${variant.storageUnit}`;
            }

            cart.products.push({
                productId: product._id,
                quantity: 1,
                variantDetails
            });
            productsAdded++;
        }

        if (productsAdded === 0) {
            return res.status(400).json({ message: 'All products are already in cart' });
        }

        await cart.save();

      
        await Wishlist.findOneAndUpdate(
            { user: userId },
            { $set: { products: [] } }
        );

        return res.status(200).json({success:true, message: 'Products moved to cart successfully' });
    } catch (error) {
        console.error('Move All to Cart Error:', error);
        return res.status(500).json({ message: 'Failed to move products to cart' });
    }
};


module.exports = { getWishlist, addToWishlist, removeFromWishlist, moveAllToCart }