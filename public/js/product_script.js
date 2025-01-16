

document.addEventListener('DOMContentLoaded', function () {

    const variantsContainer = document.getElementById('variantsContainer');
    const addVariantButton = document.getElementById('addVariant');
    let variantCount = 1;
    let activeInput = null;
    let cropper = null;
    let croppedBlobs = [];
    let imageFormat = 'image/jpeg'; // Default format


    // Add at the start of your JavaScript
    function showSpinner() {
        document.getElementById('loadingSpinner').classList.remove('hidden');
    }

    function hideSpinner() {
        document.getElementById('loadingSpinner').classList.add('hidden');
    }


    // Add new variant with enhanced animation
    addVariantButton.addEventListener('click', function () {
        const template = variantsContainer.children[0].cloneNode(true);
        template.style.opacity = '0';
        template.style.transform = 'translateY(20px)';
        template.style.transition = 'all 0.3s ease-out';




        // Update input names with new index
        template.querySelectorAll('input, select').forEach(input => {
            if (input.name) {
                input.name = input.name.replace('[0]', `[${variantCount}]`);
            }
        });


        // Reset file inputs and previews
        template.querySelectorAll('input').forEach(input => {
            input.value = '';
        });

        // Add remove functionality with animation
        const removeButton = template.querySelector('.remove-variant');
        removeButton.addEventListener('click', function () {
            template.style.opacity = '0';
            template.style.transform = 'translateY(20px)';
            setTimeout(() => {
                template.remove();
            }, 300);
        });

        variantsContainer.appendChild(template);
        // Trigger animation
        setTimeout(() => {
            template.style.opacity = '1';
            template.style.transform = 'translateY(0)';
        }, 50);

        variantCount++;
    });



    // Enhanced image preview functionality with validation
    function setupImagePreviews(container) {
        container.querySelectorAll('input[type="file"]').forEach((input, index) => {
            input.addEventListener('change', function (e) {
                if (this.files && this.files[0]) {
                    const file = this.files[0];
                    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                    const maxSize = 5 * 1024 * 1024;
                    imageFormat = file.type;


                    // Validate file type
                    if (!validTypes.includes(file.type)) {
                        notyf.error('Invalid file type! Please select a JPEG, JPG, or PNG image.');
                        this.value = '';
                        return;
                    }

                    // Validate file size
                    if (file.size > maxSize) {
                        notyf.error('File size exceeds 5MB! Please select a smaller file.');
                        this.value = '';
                        return;
                    }

                    // Store the active input and its index
                    activeInput = this;
                    activeInputIndex = index;

                    const reader = new FileReader();
                    reader.onload = function (e) {
                        showCropperModal(e.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
    }


    // Function to show the cropper modal
    function showCropperModal(imageSrc) {
        const modal = document.getElementById('cropperModal');
        const cropperImage = document.getElementById('cropperImage');

        modal.classList.remove('hidden');
        cropperImage.src = imageSrc;

        // Destroy existing cropper instance if it exists
        if (cropper) {
            cropper.destroy();
        }

        // Initialize cropper
        cropper = new Cropper(cropperImage, {
            aspectRatio: 4 / 3,
            viewMode: 0,
            autoCropArea: 1,
            responsive: true,
            restore: false
        });
    }

    // Function to hide the cropper modal
    function hideCropperModal() {
        const modal = document.getElementById('cropperModal');
        modal.classList.add('hidden');

        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    // Handle form submission
    const form = document.querySelector('form');
    const variants = document.querySelectorAll('.variant-item');
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        let isValid = true;

        const showError = (field, message) => {
            const errorField = document.createElement("p");
            errorField.className = "text-red-500 text-sm mt-1";
            errorField.textContent = message;
            field.parentElement.appendChild(errorField);
            field.classList.add("border-red-500");
        };

        const clearErrors = (field) => {
            const errorField = field.parentElement.querySelector(".text-red-500");
            if (errorField) {
                errorField.remove();
            }
            field.classList.remove("border-red-500");
        };

        const fields = [
            { id: "productName", name: "Product Name" },
            { id: "price", name: "Base Price", type: "number", min: 0 },
            { id: "discount", name: "Discount Percentage", type: "number", min: 0, max: 100 },
            { id: "category", name: "Category", type: "select" },
            { id: "brand", name: "Brand" },
            { id: "model", name: "Model" },
            { id: "platform", name: "Platform/OS" },
            { id: "returnPeriod", name: "Return Period", type: "number", min: 1 },
            { id: "warranty", name: "Warranty", type: "number", min: 0 },
            { id: "additional", name: "Additional Information" },
            { id: "description", name: "Description", type: "textarea" },
            { id: "file-upload-1", name: "Thumbnail Image", type: "file" },
        ];

        fields.forEach((fieldData) => {
            const field = document.getElementById(fieldData.id);
            clearErrors(field);

            if (fieldData.type === "select" && field.value === "") {
                showError(field, `${fieldData.name} is required.`);
                isValid = false;
            } else if (fieldData.type === "file" && field.files.length === 0) {
                showError(field, `Please upload a ${fieldData.name}.`);
                isValid = false;
            } else if (fieldData.type === "number" && (field.value === "" || isNaN(field.value))) {
                showError(field, `${fieldData.name} must be a valid number.`);
                isValid = false;
            } else if (fieldData.min !== undefined && field.value < fieldData.min) {
                showError(field, `${fieldData.name} must be at least ${fieldData.min}.`);
                isValid = false;
            } else if (fieldData.max !== undefined && field.value > fieldData.max) {
                showError(field, `${fieldData.name} must be less than or equal to ${fieldData.max}.`);
                isValid = false;
            } else if (field.value.trim() === "") {
                showError(field, `${fieldData.name} is required.`);
                isValid = false;
            }
        });

        variants.forEach((variant, index) => {
            const inputs = variant.querySelectorAll('.colorInput, .stock, .additionalPrice');
            inputs.forEach((input) => {
                if (!input.value.trim()) {
                    isValid = false;
                    
                    notyf.error(`Variant ${index + 1}: ${input.name || 'This field'} is required.`);
                }
            });
        });

        if (croppedBlobs.length < 3) {
            notyf.error('Please upload at least three product images');
            isValid = false;
        }

   
        if (!isValid) {
            return; 
        }

        try {
            showSpinner();

            const formData = new FormData(this);
            formData.delete('images');

            croppedBlobs.forEach((blob, index) => {
                const fileName = imageFormat.split('/').slice(1).join('');
                const file = new File([blob], `product-image-${index + 1}.${fileName}`, {
                    type: imageFormat
                });
                formData.append('images', file);
            });

            notyf.success('Uploading product...');

            const response = await fetch('/admin/add-product', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to upload product');
            }

            notyf.success('Product added successfully');
            window.location.href = '/admin/products';
        } catch (error) {
            notyf.error(error.message || 'Failed to add product');
            console.error('Upload error:', error);
        } finally {
            hideSpinner();
        }
    });


    // Cancel button click handler
    document.getElementById('cancelCrop').addEventListener('click', function () {
        hideCropperModal();
        if (activeInput) {
            activeInput.value = ''; // Clear the input
        }
    });

    // Apply crop button handler
    document.getElementById('applyCrop').addEventListener('click', function () {

        if (!cropper || !activeInput) return;
        cropper.getCroppedCanvas().toBlob(
            (blob) => {
                if (blob) {
                    // Store or update blob in the array at the correct index
                    const inputIndex = Array.from(activeInput.parentElement.parentElement.parentElement.children)
                        .findIndex(el => el.contains(activeInput));
                    // Store blob at the correct index
                    croppedBlobs[inputIndex] = blob;

                    // Update preview
                    const preview = activeInput.parentElement.querySelector('img');
                    const placeholder = activeInput.parentElement.querySelector('div');

                    if (preview) {
                        const url = URL.createObjectURL(blob);
                        preview.src = url;
                        preview.classList.remove('hidden');
                        if (placeholder) placeholder.classList.add('hidden');
                    }

                    hideCropperModal();
                    notyf.success('Image cropped successfully');
                }
            },
            imageFormat,
            0.8 // Image quality
        );
    });

    // Initialize the image previews
    const productImageContainer = document.querySelector('#productImageContainer');
    setupImagePreviews(productImageContainer);

    // Clean up function to prevent memory leaks
    function cleanup() {
        croppedBlobs.forEach(blob => URL.revokeObjectURL(blob));
        croppedBlobs = [];
    }

    // Call cleanup when leaving the page
    window.addEventListener('beforeunload', cleanup);



    // Remove variant functionality for initial variant
    document.querySelector('.remove-variant').addEventListener('click', function (e) {
        const variant = e.target.closest('.variant-item');
        if (variantsContainer.children.length > 1) {
            variant.style.opacity = '0';
            variant.style.transform = 'translateY(20px)';
            setTimeout(() => {
                variant.remove();
            }, 300);
        }
    });

});