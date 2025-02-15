// public/js/search.js
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const liveResults = document.getElementById('liveSearchResults');
  
    if (searchInput && liveResults) {
      let timeout;
      
      searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
          liveResults.classList.add('hidden');
          return;
        }
  
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          try {
            const response = await fetch(`/user/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            console.log(data)
            // Handle direct redirect for exact match
            if (data.redirect) {
              window.location.href = data.redirect;
              return;
            }

             // If no results
          if (!data.length) {
            liveResults.innerHTML = `
              <div class="p-4 text-center text-gray-600">
                No results found for "<span class="font-semibold">${query}</span>"
              </div>
            `;
            liveResults.classList.remove('hidden');
            return;
          }
  
            liveResults.innerHTML = data.map(item => {
              let link, content;
              
              switch(item.type) {
                case 'product':
                  link = `/user/product/${item._id}`;
                  content = `
                    <div class="flex items-center gap-4 p-4 hover:bg-gray-50">
                      <img src="${item.images[0]}" class="w-16 h-16 object-fit rounded">
                      <div>
                        <h4 class="font-semibold">${item.productName}</h4>
                      </div>
                    </div>
                  `;
                  break;
                  
                case 'category':
                  link = `/user/products/${encodeURIComponent(item.categoryName)}?selectedcategories=${encodeURIComponent(item.categoryName)}`;
                  content = `
                    <div class="flex items-center gap-4 p-4 hover:bg-gray-50">
                      <div class="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <i class="fas fa-tag text-gray-400"></i>
                      </div>
                      <div>
                        <h4 class="font-semibold">${item.categoryName}</h4>
                        <p class="text-sm text-gray-600">Category</p>
                      </div>
                    </div>
                  `;
                  break;
                  
                case 'brand':
                  link = `/user/products/all?brand=${encodeURIComponent(item.name)}`;
                  content = `
                    <div class="flex items-center gap-4 p-4 hover:bg-gray-50">
                      <div class="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <i class="fas fa-b text-gray-400"></i>
                      </div>
                      <div>
                        <h4 class="font-semibold">${item.name}</h4>
                        <p class="text-sm text-gray-600">Brand</p>
                      </div>
                    </div>
                  `;
                  break;
                 
              }
              return `
              <a href="${link}" class="block border-b last:border-0 search-result">
                ${content}
              </a>
            `;
            }).join('');
  
            liveResults.classList.remove('hidden');
  
          } catch (error) {
            liveResults.innerHTML = `
            <div class="p-4 text-center text-gray-600">
              No results found for "<span class="font-semibold">${query}</span>"
            </div>
          `;
          liveResults.classList.remove('hidden');
          }
        }, 300);
      });
      
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault(); // Prevent form submission
  
          const firstResult = liveResults.querySelector('.search-result');
          console.log(firstResult)
          if (firstResult) {
            window.location.href = firstResult.href; // Navigate to the first result
          }
        }
      });
  
      // Hide results when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchInput, #liveSearchResults')) {
          liveResults.classList.add('hidden');
        }
      });
    }
  });