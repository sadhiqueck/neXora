// image zoom

const mainImage = document.getElementById('mainImage');
if (mainImage) {
    mainImage.setAttribute('data-zoom', mainImage.src);
    window.driftInstance = new Drift(mainImage, {
        paneContainer: document.querySelector('.zoom-container'),
        inlinePane: 900,
        containInline: true,
        hoverBoundingBox: true,
        zoomFactor: 2,
        touchBoundingBox: true,
        boundingBoxContainer: document.body,
        inlineOffsetX: 0,
        inlineOffsetY: 0,
        handleTouch: true,
        injectBaseStyles: true,
        cursorStyle: 'crosshair',
        sourceAttribute: 'data-zoom',
        onShow: function () {
            document.querySelector('.zoom-container').classList.remove('hidden');
        },
        onHide: function () {
            document.querySelector('.zoom-container').classList.add('hidden');
        }
    });
}


// Product variant state management
const productState = {
    selectedColor: '',
    selectedStorage: '',
    basePrice: 0,
    currentPrice: 0,
    productId: ''
};

// Initialize product details
function initializeProductDetails(basePrice, initialColor, initialStorage, productId) {
    productState.basePrice = basePrice;
    productState.currentPrice = basePrice;
    productState.selectedColor = initialColor;
    productState.selectedStorage = initialStorage;
    productState.productId = productId;

    // Set initial selections
    const initialColorButton = document.querySelector(`[data-color="${initialColor}"]`);
    if (initialColorButton) {
        selectColor(initialColorButton, initialColor);
    }
}

// Color selection handler
function selectColor(button, color) {
    // Remove active state from all color buttons
    document.querySelectorAll('.variant-colors').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-purple-600', 'ring-offset-2');
        btn.classList.add('ring-gray-700');
    });

    // Add active state to selected button
    button.classList.remove('ring-gray-700');
    button.classList.add('ring-2', 'ring-purple-600', 'ring-offset-2');
    productState.selectedColor = color;
}

// Price update handler
function updatePrice(additionalPrice, discount, ogPrice) {
    productState.currentPrice = Math.floor((parseInt(ogPrice) + additionalPrice) * (1 - discount / 100));
    document.getElementById('finalPrice').textContent =
        productState.currentPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    document.getElementById('variantPrice').textContent =
        (parseFloat(ogPrice) + parseFloat(additionalPrice)).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR'
        });
}

function updateStock(stock) {
    const stockElement = document.getElementById('stock');
    if (stock < 5 && stock > 0) {
        stockElement.innerHTML = '<span class="text-orange-400 border-l-2 border-gray-500 pl-2">Only few left, Hurry up!</span>';
    } else if (stock < 1) {
        stockElement.innerHTML = '<span class="text-red-500 border-l-2 border-gray-500 pl-2">Out of Stock</span>';
    } else {
        stockElement.innerHTML = '<span class="text-green-500 border-l-2 border-gray-500 pl-2">In Stock</span>';
    }
}

// Storage selection handler
function initializeStorageHandlers() {
    document.querySelectorAll('input[name="storage"]').forEach(input => {
        input.addEventListener('change', function () {
            const additionalPrice = parseFloat(this.dataset.price) || 0;
            const stock = parseInt(this.dataset.stock);
            const discount = parseFloat(this.dataset.discount);
            const ogPrice = this.dataset.ogprice;

            productState.selectedStorage = this.value || '';
            updatePrice(additionalPrice, discount, ogPrice);
            updateStock(stock);
        });
    });
}


// Add to cart handler
const productDetailsaddToCart = async () => {
    try {
        const response = await fetch(`/user/cart/${productState.productId}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: productState.productId,
                selectedColor: productState.selectedColor,
                selectedStorage: productState.selectedStorage,
                price: productState.currentPrice,
                quantity: 1
            })
        });

        if (response.ok) {
            updateUIAfterAddToCart();
            notyf.success('Added to cart successfully!');
        } else {
            const error = await response.json();
            notyf.error(error.message || 'Failed to add to cart');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        notyf.error('Something went wrong!');
    }
}

function updateUIAfterAddToCart() {
    // Update cart badge
    const cartBadge = document.querySelector('.cartBadge');
    let currentCount = parseInt(cartBadge.textContent) || 0;
    cartBadge.textContent = currentCount + 1;

    // Show badge if hidden
    if (cartBadge.classList.contains('hidden')) {
        cartBadge.classList.remove('hidden');
    }

    // Replace add to cart button with go to cart button
    const buttonContainer = document.querySelector('.addToCart').parentElement;
    buttonContainer.innerHTML = `
<a href="/user/cart" class="group py-3 px-5 border border-indigo-600 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-lg w-full flex items-center justify-center gap-2 shadow-sm shadow-transparent transition-all duration-500 hover:shadow-indigo-300 hover:bg-indigo-100">
<svg class="stroke-indigo-600 transition-all duration-500 group-hover:stroke-indigo-700" width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.7394 17.875C10.7394 18.6344 10.1062 19.25 9.32511 19.25C8.54402 19.25 7.91083 18.6344 7.91083 17.875M16.3965 17.875C16.3965 18.6344 15.7633 19.25 14.9823 19.25C14.2012 19.25 13.568 18.6344 13.568 17.875M4.1394 5.5L5.46568 12.5908C5.73339 14.0221 5.86724 14.7377 6.37649 15.1605C6.88573 15.5833 7.61377 15.5833 9.06984 15.5833H15.2379C16.6941 15.5833 17.4222 15.5833 17.9314 15.1605C18.4407 14.7376 18.5745 14.0219 18.8421 12.5906L19.3564 9.84059C19.7324 7.82973 19.9203 6.8243 19.3705 6.16215C18.8207 5.5 17.7979 5.5 15.7522 5.5H4.1394ZM4.1394 5.5L3.66797 2.75" stroke="" stroke-width="1.6" stroke-linecap="round"/>
</svg>
Go to Cart
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" style="fill:currentColor">
<path d="M10.296 7.71 14.621 12l-4.325 4.29 1.408 1.42L17.461 12l-5.757-5.71z"></path>
<path d="M6.704 6.29 5.296 7.71 9.621 12l-4.325 4.29 1.408 1.42L12.461 12z"></path>
</svg>
</a>`;


}

// Initialize product details on page load
document.addEventListener('DOMContentLoaded', () => {
    const productData = {
        basePrice: parseFloat(document.querySelector('#finalPrice').textContent.replace(/[^0-9.-]+/g, "")),
        initialColor: document.querySelector('.variant-colors').dataset.color,
        initialStorage: document.querySelector('input[name="storage"]:checked')?.value || '',
        productId: document.querySelector('.addToCart')?.dataset.product_id
    };

    initializeProductDetails(
        productData.basePrice,
        productData.initialColor,
        productData.initialStorage,
        productData.productId
    );
    initializeStorageHandlers();

    // Add event listeners to color buttons
    document.querySelectorAll('.variant-colors').forEach(button => {
        button.addEventListener('click', () => selectColor(button, button.dataset.color));
    });

    // Add to cart button event listener
    document?.querySelector('.addToCart')?.addEventListener('click', productDetailsaddToCart);
});


function changeImage(newImageSrc) {
    // Update main image
    const mainImage = document.getElementById('mainImage');
    mainImage.src = newImageSrc;
    mainImage.setAttribute('data-zoom', newImageSrc);

    // Destroy existing Drift instance
    if (window.driftInstance) {
        window.driftInstance.destroy();
    }

    // Create new Drift instance with updated image
    window.driftInstance = new Drift(mainImage, {
        paneContainer: document.querySelector('.zoom-container'),
        inlinePane: 900,
        containInline: true,
        hoverBoundingBox: true,
        zoomFactor: 2,
        touchBoundingBox: true,
        boundingBoxContainer: document.body,
        inlineOffsetX: 0,
        inlineOffsetY: 0,
        handleTouch: true,
        injectBaseStyles: true,
        sourceAttribute: 'data-zoom',
        onShow: function () {
            document.querySelector('.zoom-container').classList.remove('hidden');
        },
        onHide: function () {
            document.querySelector('.zoom-container').classList.add('hidden');
        }
    });
}

// for smooth scrolling two know more button

document.getElementById('showMoreBtn').addEventListener('click', function (event) {
    event.preventDefault();
    document.querySelector('#productDescription').scrollIntoView({
        behavior: 'smooth',
        block: 'start',
    });
});

