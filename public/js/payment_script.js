// spinner

function showSpinner() {
    console.log('spinning')
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideSpinner() {
    console.log('hidded')
    document.getElementById('loadingSpinner').classList.add('hidden');
}

async function handleRazorpayPayment(total) {
    try {
        showSpinner();

        //create order on your server
        const createOrderResponse = await fetch('/user/create-razorpay-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ total })
        });

        if (createOrderResponse.status == 404) {
            notyf.error('Sorry, Product went Stock out');
            setTimeout(() => {
                window.location.href = '/user/cart';
            }, 500);
            return;
        } else if (!createOrderResponse.ok) {
            throw new Error('Failed to create order');
        }

        const { order } = await createOrderResponse.json();
        console.log(order)

        // Razorpay options
        const options = {
            key: razorpayKey,
            amount: order.amount,
            currency: 'INR',
            name: 'Nexora',
            description: 'Order Payment',
            order_id: order.id,
            retry: {
                enabled: false,
                // max_count: 3,
            },
            prefill: {
                name: UserName,
                email: UserEmail,
                contact: UserMobile
            },
            theme: {
                color: '#7e3af2',
                hide_topbar: false
            },
            notes: {
                order_type: 'Standard',
                shipping_address: order.shippingAddress,
                customer_id: order.userId
            },
            image: '/images/lOGO.png',

            handler: async function (response) {
                const appliedCouponData = document.getElementById('appliedCouponData').value;
                const coupon = appliedCouponData ? JSON.parse(appliedCouponData) : null;

                // Verify payment on your server
                const verificationResponse = await fetch('/user/verify-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature,
                        appliedCouponData: coupon
                    })
                });

                if (verificationResponse.ok) {
                    window.location.href = '/user/order-success';
                } else {
                    notyf.error('Payment verification failed');
                }
            },

            modal: {
                ondismiss: function () {
                    notyf.error('Payment cancelled. Please try again.');
                },
                escape: false
            },

        };

        const rzp = new Razorpay(options);
        rzp.open();

      
        rzp.on('payment.failed', async function (response) {
            try {
                const appliedCouponData = document.getElementById('appliedCouponData').value;
                const coupon = appliedCouponData ? JSON.parse(appliedCouponData) : null;
        
                await fetch('/user/handle-payment-failure', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        razorpayOrderId: order.id,
                        appliedCouponData: coupon
                    })
                });
                window.location.href='/user/orders'
            } catch (error) {
                console.error('Error handling payment failure:', error);
                notyf.error('Failed to process payment failure');
            }
        });

    } catch (error) {
        console.error('Payment error:', error);
        notyf.error('Payment processing failed. Please try again.');
    } finally {
        hideSpinner();
    }
}


const placeOrder = () => {
    try {
        showSpinner();

        const selectedPayment = document.querySelector('input[name="payment"]:checked');

        if (!selectedPayment) {
            notyf.error('Please select a payment method');
            return;
        }
        // Get applied coupon details
        const appliedCouponData = document.getElementById('appliedCouponData').value;
        const coupon = appliedCouponData ? JSON.parse(appliedCouponData) : null;

        const payload = {
            paymentMethod: selectedPayment.value,
            appliedCouponData: coupon,

        };

        if (selectedPayment.value === 'Razorpay') {
            if (coupon) {
                handleRazorpayPayment(total - coupon.discount);
                return
            }
            handleRazorpayPayment(total);

        } else {
            // Handle COD or other methods
            fetch('/user/place-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
                .then(response => {
                    if (response.ok) {
                        window.location.href = '/user/order-success';
                    } else if (response.status == 404) {
                        notyf.error('Sorry, Product went Stock out')
                        setTimeout(() => {
                            window.location.href = '/user/cart'
                        }, 500);
                    } else {
                        notyf.error("Failed to place order");
                    }
                })
                .catch(err => {
                    console.error('Error:', err);
                    notyf.error('Network error. Please try again.');
                });
        }
    } catch (error) {
        console.log(error);
        notyf.error("Some internal error cause. Try later")
    } finally {
        hideSpinner()
    }

};



function selectCoupon(code) {
    document.getElementById('couponInput').value = code;
    applyCoupon();
}

async function applyCoupon() {
    try {
        const code = document.getElementById('couponInput').value.trim();
        const errorMssg = document.getElementById('errorMssg')
        if (!code) {
            notyf.error('Please enter a coupon code')
            errorMssg.textContent = "Please enter a coupon code";
            return
        }


        const response = await fetch('/user/coupon-validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, cartId, userId })
        });

        const data = await response.json();
        if (data.success) {
            updateOrderSummary(data.discount, data.coupon);
            showCouponApplied(data.coupon, data.discount);
            notyf.success('Coupon applied successfully!');
            errorMssg.textContent = ''
        } else {
            notyf.error(data.message || 'Failed to apply coupon');
            errorMssg.textContent = data.message || 'Failed to apply coupon'
        }
    } catch (error) {
        console.error('Error applying coupon:', error);
        notyf.error('Failed to apply coupon');
    }
}

let appliedCoupon = null;

function removeCoupon() {
    appliedCoupon = null;
    document.getElementById('appliedCoupon').classList.add('hidden');
    document.getElementById('couponInput').value = '';
    document.getElementById('appliedCouponData').value = '';
    updateOrderSummary(0);
    showMessage('Coupon removed', 'gray');
}

function showCouponApplied(coupon, discount) {
    document.getElementById('appliedCoupon').classList.remove('hidden');
    const couponButton = document.getElementById('couponApply-btn');
    couponButton.textContent = 'Applied';
    couponButton.setAttribute('disabled', 'true');
    document.getElementById('couponCodeDisplay').textContent = coupon.code;
    document.getElementById('couponDiscount').textContent =
        coupon.discountType === 'percentage' ?
            `${coupon.value}% off` :
            `₹${discount} off`;
}

function updateOrderSummary(discount, couponData) {
    const subtotal = document.getElementById('total').textContent;
    const newTotal = parseFloat(total) - discount;

    document.getElementById('additionalDiscount').textContent = `- ₹${discount.toLocaleString("en-IN")}`;
    document.getElementById('total').textContent = `${newTotal.toLocaleString("en-IN", { style: "currency", currency: 'INR' })}`;

    const appliedCouponData = JSON.stringify({
        code: couponData.code,
        discount: couponData.discount,
        id: couponData.id
    });
    document.getElementById('appliedCouponData').value = appliedCouponData || '';
}

function showMessage(text, color) {
    const messageDiv = document.getElementById('couponMessage');
    messageDiv.textContent = text;
    messageDiv.className = `mt-2 text-sm text-${color}-600`;
    setTimeout(() => messageDiv.textContent = '', 3000);
}
function toggleMoreCoupons() {
    const moreCoupons = document.getElementById('moreCoupons');
    const viewMoreText = document.getElementById('viewMoreText');
    const viewMoreIcon = document.getElementById('viewMoreIcon');

    moreCoupons.classList.toggle('hidden');

    if (moreCoupons.classList.contains('hidden')) {
        viewMoreText.textContent = 'View More';
        viewMoreIcon.style.transform = 'rotate(0deg)';
    } else {
        viewMoreText.textContent = 'View Less';
        viewMoreIcon.style.transform = 'rotate(180deg)';
    }
}

hideSpinner()

