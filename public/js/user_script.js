
// spinner

function showSpinner() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideSpinner() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

// global Notyf instance
const notyf = new Notyf({
    duration: 2000,
    position: { x: 'right', y: 'top' }
});

// Add custom styles for Notyf
const style = document.createElement('style');
style.innerHTML = `
.notyf__toast {
    border-radius: 8px; 
    margin-bottom: 10px; 
    box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
}
`;
document.head.appendChild(style);

async function addToCart(button) {
    const productId = button.getAttribute('data-product_id');
    try {
        const response = await fetch('/user/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        });

        if (response.ok) {
            notyf.success('Moved to cart!');
            //  cart badge and button update
            const cartBadge = document.querySelector('.cartBadge');
            let currentCount = parseInt(cartBadge.textContent) || 0;
            currentCount += 1;
            cartBadge.textContent = currentCount;

            const buttonContainer = button.parentElement;
            buttonContainer.innerHTML = `
        <a href="/user/cart" class="w-full flex items-center justify-center rounded-md bg-indigo-500 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300">
           <svg xmlns="http://www.w3.org/2000/svg"
           class="mr-2 h-6 w-6" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Go to Cart
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                style="fill: rgba(255, 255, 255, 1)">
                <path d="M10.296 7.71 14.621 12l-4.325 4.29 1.408 1.42L17.461 12l-5.757-5.71z">
                </path>
                <path d="M6.704 6.29 5.296 7.71 9.621 12l-4.325 4.29 1.408 1.42L12.461 12z">
                </path>
                </svg>
        </a>
    `;

            if (cartBadge.classList.contains('hidden')) {
                cartBadge.classList.remove('hidden');
            }
        } else {
            const error = await response.json();
            notyf.error(error.message || "Failed to add to cart");
        }
    } catch (error) {
        console.error("Error adding to cart:", error);
        notyf.error('Something went wrong!');
    }
}


function redirectToLogin() {
    const currentPath = window.location.pathname + window.location.search;
    notyf.error("Login First!!");
    setTimeout(() => {
        window.location.href = `/user/login?redirect=${encodeURIComponent(currentPath)}`;
    }, 600);


}

// wishlist 
async function toggleWishlist(button) {
    try {
        const productId = button.getAttribute('data-product-id');
        const isWishlisted = button.getAttribute('data-is-wishlisted') === 'true';
        const heartIcon = button.querySelector('.fa-heart');

        button.disabled = true;

        const method = isWishlisted ? 'DELETE' : 'POST';
        const endpoint = `/user/wishlist/${productId}`;

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const newWishlistState = !isWishlisted;

            const wishlistBadge = document.querySelector('.wishlistBadge');
            let currentCount = parseInt(wishlistBadge.textContent) || 0;
            if (newWishlistState) {
                wishlistBadge.classList.remove('hidden')
                currentCount += 1;

            } else {
                currentCount -= 1;
            }

            wishlistBadge.textContent = currentCount;

            button.setAttribute('data-is-wishlisted', newWishlistState);

            heartIcon.classList.toggle('fa-regular', !newWishlistState);
            heartIcon.classList.toggle('fa-solid', newWishlistState);

            button.classList.toggle('text-red-500', newWishlistState);
            button.classList.toggle('text-gray-600', !newWishlistState);
        } else {
            console.error('Wishlist operation failed');
        }
    } catch (err) {
        console.error('Wishlist error:', err);
    } finally {

        button.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {

    // script for login page

    if (document.body.id === 'login-page') {

        const form = document.getElementById('loginForm');
        const emailInput = document.querySelector("#email");
        const passwordInput = document.querySelector("#password");
        const mssg = document.querySelector("#mssg");
        const urlParams = new URLSearchParams(window.location.search);
        const sccsmsg = urlParams.get('mssg');
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        const passwordRegex = /^.{6,}$/;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (email === "" || password === "") {
                mssg.textContent = "Fields cannot be blank!";
                mssg.style.color = "red";
                emailInput.focus();
                return;

            } else if (!emailRegex.test(email)) {
                mssg.textContent = "Enter a valid email!";
                mssg.style.color = "red";
                emailInput.focus();
                return;
            } else if (!passwordRegex.test(password)) {
                mssg.textContent = "Password must include at least 6 characters.";
                mssg.style.color = "red";
                passwordInput.focus();
                return;


            } else {
                mssg.textContent = "";

                try {

                    const response = await fetch('/user/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await response.json();

                    if (data.success) {
                        const redirectUrl = urlParams.get('redirect') || '/user/home';
                        console.log('url', urlParams.get('redirect'))
                        window.location.href = redirectUrl;
                    } else {
                        mssg.textContent = data.message || 'Login failed!';
                        mssg.style.color = 'red';
                    }

                } catch (error) {
                    console.error('Error during login:', error);
                    mssg.textContent = 'An error occurred. Please try again.';
                    mssg.style.color = 'red';
                }
            }


        });

        if (sccsmsg) {
            const messageElement = document.getElementById('mssg');
            messageElement.textContent = sccsmsg;
            messageElement.style.color = 'green';
        }

        document.getElementById('googleLoginBtn').addEventListener('click', async () => {

            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect');

            const button = document.getElementById('googleLoginBtn');
            button.disabled = true;

            button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Signin with Google...
        `;

            let googleAuthUrl = '/user/auth/google';
            if (redirectUrl) {
                googleAuthUrl += `?redirect=${encodeURIComponent(redirectUrl)}`;
            }
            window.location.href = googleAuthUrl;
        })


    }

    // signup page

    if (document.body.id === 'signup_page') {

        const form = document.getElementById('signupForm');
        const usernameInput = document.querySelector("#username");
        const emailInput = document.querySelector("#email");
        const passwordInput = document.querySelector("#password");
        const confirmPasswordInput = document.querySelector("#confirmPassword");  // Add this line for the confirm password input
        const checkbox = document.querySelector('#agree');
        const mssg = document.querySelector("#mssg");
        const urlParams = new URLSearchParams(window.location.search);
        const sccsmsg = urlParams.get('mssg');

        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        const passwordRegex = /^.{6,}$/;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();
            const referralCode = document.getElementById('referralCode').value



            if (username === "" || email === "" || password === "" || confirmPassword === "") {
                mssg.textContent = "Fields cannot be blank!";
                mssg.style.color = "red";
                usernameInput.focus();
                return;

            } else if (!/^[a-zA-Z _]+$/.test(username)) {
                mssg.textContent = "Enter a valid name";
                mssg.style.color = "red";
                usernameInput.focus();
                return;


            } else if (!emailRegex.test(email)) {
                mssg.textContent = "Enter a valid email address!!";
                mssg.style.color = "red";
                emailInput.focus();
                return;


            } else if (password !== confirmPassword) {
                mssg.textContent = "Passwords do not match!";
                mssg.style.color = "red";
                confirmPasswordInput.focus();
                return;


            } else if (!passwordRegex.test(password)) {
                mssg.textContent = "Password must include at least 6 characters.";
                mssg.style.color = "red";
                passwordInput.focus();
                return;


            } else if (!checkbox.checked) {
                mssg.textContent = "You must agree with the terms and conditions!";
                mssg.style.color = "red";
                checkbox.focus();
                return;


            } else {
                mssg.textContent = "";
                const titleCasedName = toTitleCase(usernameInput.value);
                usernameInput.value = titleCasedName;
                try {
                    showSpinner()
                    const response = await fetch('/user/send-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, email, password, referralCode })
                    });
                    const data = await response.json();

                    if (data.success) {
                        notyf.success('OTP Sended Succesfully')
                        setTimeout(() => {
                            window.location.href = '/user/verify-otp';
                        }, 300);

                    } else {
                        mssg.textContent = data.message || 'Signup failed!';
                        mssg.style.color = 'red';
                    }

                } catch (error) {
                    console.error('Error during login:', error);
                    mssg.textContent = 'An error occurred. Please try again.';
                    mssg.style.color = 'red';
                } finally {
                    hideSpinner()
                }
            }
        });


        if (sccsmsg) {
            mssg.textContent = sccsmsg;
            mssg.style.color = 'green';
        }

        document.getElementById('googleLoginBtn').addEventListener('click', async () => {

            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect');
    
            const button = document.getElementById('googleLoginBtn');
            button.disabled = true;
    
            button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            SignUp with Google...
        `;
    
            let googleAuthUrl = '/user/auth/google';
            if (redirectUrl) {
                googleAuthUrl += `?redirect=${encodeURIComponent(redirectUrl)}`;
            }
            window.location.href = googleAuthUrl;
    
    
        })
        function toTitleCase(input) {
            return input
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
    }





    // ....................


    // otp Page
    if (document.body.id === 'otp_verification') {
        const form = document.getElementById('otp-form');
        const inputs = [...form.querySelectorAll('input[type=text]')];
        const submit = form.querySelector('button[type=submit]');
        const otpCombined = document.createElement('input');
        otpCombined.type = 'hidden';
        otpCombined.name = 'otp';
        form.appendChild(otpCombined);

        const updateCombinedOTP = () => {
            const otp = inputs.map(input => input.value || '0').join('');
            otpCombined.value = otp.slice(0, 4); // Combine OTP and keep only the first 4 characters
            console.log('Combined OTP:', otpCombined.value);
            validateOTP(); // Call validation function
        };

        const validateOTP = () => {
            // Check if all OTP fields are filled
            const isOTPComplete = inputs.every(input => input.value.length === 1);

            if (isOTPComplete) {
                submit.disabled = false; // Enable the submit button if OTP is complete
            } else {
                submit.disabled = true; // Disable the submit button if OTP is not complete
            }
        };

        const handleKeyDown = (e) => {
            // Only allow numeric input, backspace, and navigation keys
            const isNumeric = /^[0-9]$/.test(e.key);
            const isControlKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(e.key);

            if (!isNumeric && !isControlKey) {
                e.preventDefault();
            }

            // Handle backspace and delete
            if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.value === '') {
                const index = inputs.indexOf(e.target);
                if (index > 0) {
                    inputs[index - 1].value = '';
                    inputs[index - 1].focus();
                }
            }

            if (e.key === 'ArrowLeft' && e.target !== inputs[0]) {
                const index = inputs.indexOf(e.target);
                inputs[index - 1].focus();
            }

            if (e.key === 'ArrowRight' && e.target !== inputs[inputs.length - 1]) {
                const index = inputs.indexOf(e.target);
                inputs[index + 1].focus();
            }
        };

        const handleInput = (e) => {
            const { target } = e;
            const index = inputs.indexOf(target);

            // Move to next input if current is filled
            if (target.value.length === 1) {
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    submit.focus();
                }
            }

            updateCombinedOTP();
        };

        const handlePaste = (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');

            // Validate pasted text
            if (/^\d{4}$/.test(text)) {
                text.split('').forEach((digit, index) => {
                    if (inputs[index]) inputs[index].value = digit;
                });
                submit.focus();
                updateCombinedOTP();
            }
        };

        // Add event listeners
        inputs.forEach(input => {
            input.addEventListener('input', handleInput);
            input.addEventListener('keydown', handleKeyDown);
            input.addEventListener('paste', handlePaste);
        });


        validateOTP();

        // Resend otp timer

        const resendLink = document.getElementById('resendLink');
        const timerSpan = document.getElementById('timer');
        let timer = 15;
        let countdown;

        const startTimer = () => {
            clearInterval(countdown);
            timer = 15;
            resendLink.setAttribute('disabled', 'true');
            timerSpan.textContent = timer;

            countdown = setInterval(() => {
                timer--;
                timerSpan.textContent = timer;

                if (timer <= 0) {
                    clearInterval(countdown);
                    resendLink.removeAttribute('disabled');
                    resendLink.textContent = 'Resend OTP';
                }
            }, 1000);
        };

        // Resend OTP function
        const resendOTP = () => {
            try {
                fetch('/user/resend-otp', { method: 'POST' })
                    .then(response => {
                        if (response.ok) {
                            notyf.success('OTP re-sent successfully.');

                        } else {
                            notyf.error('Failed to resend OTP. Please try again.');
                        }
                    })
            } catch (error) {
                console.error('Error resending OTP:', error);
                notyf.error('Something went wrong. Please try again.');
            }
        };


        resendLink.addEventListener('click', (event) => {
            resendLink.textContent = 'Resend OTP in ';
            resendLink.appendChild(timerSpan);
            startTimer();
            event.preventDefault();
            resendOTP();
        });

        startTimer();
    }
});