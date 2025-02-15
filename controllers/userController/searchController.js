const productsDB = require('../../models/productModel')
const categoriesDB = require('../../models/categoryModel')


  const searchResultApi= async (req, res) => {
    try {
        const query = req.query.q.trim();

        // Parallel search across different collections
        const [products, categories, brands] = await Promise.all([
          // Product search
          productsDB.find({
            $text: { $search: query },
            isDeleted: false
          }, {
            _id: 1,
            productName: 1,
            images: 1,
          }).limit(5),
    
          // Category search
          categoriesDB.find({
            $text: { $search: query },
            isDeleted: false
          },{
            _id: 1,
            categoryName: 1,
          }).limit(3),
    
          // Brand search
          productsDB.distinct('brand', {
            brand: new RegExp(query, 'i'),
            isDeleted: false
          })
     
        ]);
    
        // Prepare results with type identifiers
        const results = [
          ...categories.map(c => ({ ...c.toObject(), type: 'category' })),
          ...brands.map(b => ({ name: b, type: 'brand' })),
          ...products.map(p => ({ ...p.toObject(), type: 'product' }))
        ];
    
        // Sort by type priority: category > brand > product
        results.sort((a, b) => {
          const typeOrder = { category: 1, brand: 2, product: 3 };
          return typeOrder[a.type] - typeOrder[b.type];
        });

    
        res.json(results);
    
      } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
      }
  }



  module.exports={searchResultApi}