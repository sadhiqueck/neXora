

document.addEventListener('DOMContentLoaded', function () {

    const variantsContainer = document.getElementById('variantsContainer');
    const addVariantButton = document.getElementById('addVariant');
    let variantCount = 1;
    let activeInput = null;
    let cropper = null;



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
                    console.log(activeInput.parentElement)
                    const preview = activeInput.parentElement.querySelector('img');
                    const placeholder = activeInput.parentElement.querySelector('div');
                    console.log(preview);

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

    // Cancel button click handler
    document.getElementById('cancelCrop').addEventListener('click', function () {
        hideCropperModal();
        if (activeInput) {
            activeInput.value = ''; // Clear the input
        }
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


  

});