
document.addEventListener('DOMContentLoaded', () => {
    let currentProductId = null;
    const returnOrderModal = document.getElementById('returnOrderModal');
    const returnReasonSelect = document.getElementById('reasonOptions');
    const returnDescriptionTextarea = document.getElementById('reasonDescription');
    const confirmReturnBtn = document?.querySelector('.confirmReturnBtn')
    const cancelOrderModal = document.getElementById('cancelOrderModal');
    const cancelReasonTextarea = document.getElementById('reason');
    const confirmCancelBtn = cancelOrderModal.querySelector('.confirmCancelBtn');


    // Cancel enitre order
    confirmCancelBtn?.addEventListener('click', async () => {
        const reason = cancelReasonTextarea.value.trim();
        if (!reason) {
            notyf.error("Please provide a reason for cancellation");
            return;
        }

        try {
            let endpoint = '/user/order/cancel';
            let body = { orderId, reason };

            if (currentProductId) {
                endpoint = '/user/order/cancel-item';
                body.productId = currentProductId;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                notyf.success(currentProductId ? "Item cancelled successfully" : "Order cancelled successfully");
                setTimeout(() => window.location.reload(), 500);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            notyf.error(error.message || "Failed to cancel");
        } finally {
            cancelOrderModal.classList.add('hidden');
            currentProductId = null;
        }
    });





    // Single event listener for confirm button
    confirmReturnBtn?.addEventListener('click', async () => {
        const reason = returnReasonSelect.value.trim();
        const description = returnDescriptionTextarea.value;

        if (!reason) {
            notyf.error("Please select a reason for return");
            return;
        }

        try {
            let endpoint = '/user/order/return';
            let body = { orderId, reason, description };


            if (currentProductId) {
                endpoint = '/user/order/return-item';
                body.productId = currentProductId;
            }


            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                notyf.success(`Return request submitted successfully`);
                setTimeout(() => window.location.reload(), 500);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            notyf.error(error.message || "Failed to submit return request");
        } finally {

            currentProductId = null;
        }
    });

    // Order return button handler
    document.getElementById('orderReturnBtn')?.addEventListener('click', () => {
        currentProductId = null;
    });

    // Item return buttons handler
    document.querySelectorAll('.returnItem').forEach(button => {
        button.addEventListener('click', () => {
            currentProductId = button.getAttribute('data-product-id');
            // returnOrderModal.classList.remove('hidden');
        });
    });

    // Reset modal state when closed
    returnOrderModal.querySelector('[data-modal-hide]').addEventListener('click', () => {
        returnReasonSelect.value = '';
        returnDescriptionTextarea.value = '';
        currentProductId = null;
    });


    // Cancel Item Buttons
    const cancelItemBtns = document.querySelectorAll('.cancelItem');

    cancelItemBtns.forEach(button => {
        button.addEventListener('click', () => {
            currentProductId = button.getAttribute('data-product-id');
            console.log(currentProductId)
            cancelOrderModal.classList.remove('hidden');
        });
    });

    // Cancel Order Button
    const cancelOrderBtn = document.getElementById('orderCancelBtn');

    cancelOrderBtn?.addEventListener('click', () => {
        currentProductId = null;
        cancelOrderModal.classList.remove('hidden');
    });

    async function downloadInvoice(orderId) {
        try {

            notyf.success('Downloading...')
            // Fetch order details
            const response = await fetch(`/user/order/${orderId}/invoice`);
            const order = await response.json();

            // Create invoice HTML
            const invoiceHtml = `
    <div style="font-family: Arial, sans-serif; padding: 40px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="/Images/lOGO.png" alt="Company Logo" style="width: 150px; height: auto;">
            <h1 style="font-size: 24px; margin: 10px 0;">Invoice</h1>
        </div>

        <!-- Order and Customer Details -->
        <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between;">
                <div>
                    <h2 style="font-size: 18px; margin-bottom: 10px;">Order Details</h2>
                    <p><strong>Order ID:</strong> ${order.orderNumber}</p>
                    <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                    <h2 style="font-size: 18px; margin-bottom: 10px;">Customer Details</h2>
                    <p><strong>Name:</strong> ${order.userId?.username || 'Guest'}</p>
                    <p><strong>Email:</strong> ${order.userId?.email || 'N/A'}</p>
                </div>
            </div>
        </div>

        <!-- Shipping and Billing Addresses -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
                <h2 style="font-size: 18px; margin-bottom:10px ;"><b>Shipping Address</b></h2>
                <p>${order.shippingAddress.fullName}</p>
                <p>${order.shippingAddress.addressLine1}</p>
                <p>${order.shippingAddress.addressLine2},${order.shippingAddress.landmark},
                 ${order.shippingAddress.city},${order.shippingAddress.state} ${order.shippingAddress.pincode}</p>
                <p>India</p>
            </div>
            <div>
                <h2 style="font-size: 18px; margin-bottom: 10px font-bold;"><b>Billing Address</b></h2>
                <p>${order.userId?.username}</p>
                <p>${order.shippingAddress.addressLine1}</p>
                <p>${order.shippingAddress.addressLine2}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}</p>
                <p>India</p>
            </div>
        </div>

        <!-- Order Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px; border: 1px solid #ddd;">Product</th>
                    <th style="padding: 10px; border: 1px solid #ddd;">Quantity</th>
                    <th style="padding: 10px; border: 1px solid #ddd;">Price</th>
                    <th style="padding: 10px; border: 1px solid #ddd;">Discount</th>
                    <th style="padding: 10px; border: 1px solid #ddd;">Tax(GST)</th>
                    <th style="padding: 10px; border: 1px solid #ddd;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${order.products.map(item =>
                ` <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.productName}- ${item.model}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.quantity}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">₹${(item.price * 82 / 100).toFixed(2)}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">-₹${(item.price - item.discountedPrice).toFixed(2)}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">₹${(item.price * 18 / 100).toFixed(2)} (18%)</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">₹${(item.quantity * item.discountedPrice).toFixed(2)}</td>
                    </tr>
                    
                `).join('')}
            </tbody>
        </table>

        <!-- Order Summary -->
        <div style="text-align: right;">
            <p><strong>Subtotal:</strong> ₹${order.originalTotal.toFixed(2)}</p>
            <p><strong>Discount:</strong>- ₹${((order.totalSavings + order.couponApplied.discount) || 0).toFixed(2)}</p>
            <p><strong>Shipping Charges:</strong> ₹${((order.deliveryCharge) || 0).toFixed(2)}</p>
            <p><strong>Total:</strong> ₹${(order.total).toFixed(2)}</p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #666;">
            <p>Thank you for shopping with us!</p>
            <p>Contact us at support@nexora.com for any queries.</p>
        </div>
    </div>
`;

            // Create a temporary container for the invoice
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = invoiceHtml;
            document.body.appendChild(tempContainer);

            // Generate PDF
            html2canvas(tempContainer, { scale: 2 }).then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(`invoice_${order.orderNumber}.pdf`);
            });
            document.body.removeChild(tempContainer);
        } catch (error) {
            console.log(error);
            notyf.error('Cannot download invoice')
        } finally {
            notyf.success('Downloaded')
        }

    }

})