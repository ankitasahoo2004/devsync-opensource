document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('wf-form-Contact-Form');
    const submitButton = form.querySelector('a[contact-trigger]');

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
        return container;
    }

    function showToast({ title, message, type = 'success', duration = 5000 }) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success'
            ? '<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>'
            : '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/></svg>';

        toast.innerHTML = `
            ${icon}
            <div class="toast-content">
                <h4 class="toast-title">${title}</h4>
                <p class="toast-message">${message}</p>
            </div>
        `;

        const toastContainer = document.getElementById('toast-container') || createToastContainer();
        toastContainer.appendChild(toast);

        // Trigger reflow to enable animation
        toast.offsetHeight;

        // Show toast
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove toast after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get the submit button
        const submitBtn = form.querySelector('[contact-trigger]');
        if (!submitBtn) {
            console.error('Submit button not found');
            return;
        }

        const btnText = submitBtn.querySelector('.btn-txt');
        const originalText = btnText ? btnText.textContent : 'Submit';

        // Show loading state
        if (btnText) {
            btnText.textContent = 'Sending...';
        }
        submitBtn.style.pointerEvents = 'none';
        submitBtn.style.opacity = '0.7';

        // Show loading toast
        showToast({
            title: 'Sending Message',
            message: 'Please wait while we process your request...',
            type: 'loading',
            duration: 15000
        });

        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            // This is now exclusively a sponsorship form, so we always use the sponsorship endpoint
            const endpoint = window.API_CONFIG ? window.API_CONFIG.endpoints.sponsorship : '/api/sponsorship/inquiry';

            // Collect all the sponsorship-specific data dynamically
            const selectedServices = getSelectedServices();
            const selectedBudget = getSelectedBudget();
            const selectedDeadline = getSelectedDeadline();
            const selectedDiscoverySource = getSelectedDiscoverySource();

            console.log('Form data collection:', {
                services: selectedServices,
                budget: selectedBudget,
                deadline: selectedDeadline,
                discoverySource: selectedDiscoverySource,
                formEntries: data
            });

            const requestBody = {
                organization: data.organization || data.name,
                name: data.name,
                email: data.email,
                sponsorshipType: selectedServices.join(', ') || 'Not specified',
                message: data.message,
                website: data.Website || '',
                startDate: data.Date || '',
                budget: selectedBudget,
                deadline: selectedDeadline,
                discoverySource: selectedDiscoverySource.join(', '),
                formType: 'sponsorship'
            };

            console.log('Sending request to:', endpoint);
            console.log('Request body:', requestBody);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log('Response data:', responseData);

            // Show success toast
            const successMessage = 'Thank you for your sponsorship inquiry! We will review your request and get back to you soon.';

            showToast({
                title: 'Sponsorship Inquiry Sent!',
                message: successMessage,
                type: 'success'
            });

            // Reset form
            form.reset();

            // Show success message in the form
            const successElement = form.querySelector('.success-message');
            if (successElement) {
                successElement.style.display = 'block';
                setTimeout(() => {
                    successElement.style.display = 'none';
                }, 5000);
            }

        } catch (error) {
            console.error('Error submitting form:', error);

            let errorMessage = 'Failed to send message. Please try again or contact us directly.';

            if (error.message.includes('404')) {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            }

            showToast({
                title: 'Error',
                message: errorMessage,
                type: 'error'
            });

            // Show error message in the form
            const errorElement = form.querySelector('.error-message');
            if (errorElement) {
                errorElement.style.display = 'block';
                setTimeout(() => {
                    errorElement.style.display = 'none';
                }, 5000);
            }
        } finally {
            // Restore button state
            if (btnText) {
                btnText.textContent = originalText;
            }
            submitBtn.style.pointerEvents = '';
            submitBtn.style.opacity = '';
        }
    });

    function determineSponsorshipType(message, services) {
        const messageText = message.toLowerCase();

        if (messageText.includes('platinum') || messageText.includes('premier') || messageText.includes('exclusive')) {
            return 'platinum';
        } else if (messageText.includes('gold') || messageText.includes('premium')) {
            return 'gold';
        } else if (messageText.includes('silver') || messageText.includes('standard')) {
            return 'silver';
        } else if (messageText.includes('bronze') || messageText.includes('basic')) {
            return 'bronze';
        }

        // Determine based on services requested
        if (services.length > 5) {
            return 'platinum';
        } else if (services.length > 3) {
            return 'gold';
        } else if (services.length > 1) {
            return 'silver';
        }

        return 'general';
    }

    function getSelectedBudget() {
        const checkedBudget = form.querySelector('input[name="budgetGroup"]:checked');
        return checkedBudget ? checkedBudget.value : '';
    }

    function getSelectedServices() {
        const serviceCheckboxes = ['Financial', 'Swag', 'Event', 'Tech', 'Prize', 'Venue', 'Media', 'Mentorship', 'Other'];
        const services = [];

        serviceCheckboxes.forEach(service => {
            const checkbox = form.querySelector(`input[name="${service}"], input[id="c${service}"]`);
            if (checkbox && checkbox.checked) {
                const serviceText = checkbox.closest('label').querySelector('.btn-txt').textContent;
                services.push(serviceText);
            }
        });

        return services;
    }

    function getSelectedDeadline() {
        const checkedDeadline = form.querySelector('input[name="deadlineGroup"]:checked');
        return checkedDeadline ? checkedDeadline.value : '';
    }

    function getSelectedDiscoverySource() {
        const discoveryCheckboxes = ['WebsiteSource', 'SocialMedia', 'PreviousEvent', 'WordOfMouth', 'University', 'Partner', 'Other'];
        const sources = [];

        discoveryCheckboxes.forEach(source => {
            const checkbox = form.querySelector(`input[name="${source}"], input[id="${source}"]`);
            if (checkbox && checkbox.checked) {
                const sourceText = checkbox.closest('label').querySelector('.btn-txt').textContent;
                sources.push(sourceText);
            }
        });

        return sources;
    }

    function initializeForm() {
        // Add inquiry type field at the beginning of the form
        const inquiryTypeHTML = `
            <div class="form-field-w" id="inquiryTypeField">
                <p split-text="" class="text-small caps">What type of inquiry is this?</p>
                <div class="checkboxes-w is-grid">
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="inquiryGeneral" type="radio" name="inquiryType" data-name="inquiryType" value="general" required="" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="inquiryGeneral">General Inquiry</span>
                    </label>
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="inquirySponsorship" type="radio" name="inquiryType" data-name="inquiryType" value="sponsorship" required="" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="inquirySponsorship">Sponsorship Inquiry</span>
                    </label>
                </div>
                <div class="form-line"></div>
            </div>
        `;

        // Add sponsorship-specific fields
        const sponsorshipHTML = `
            <div class="form-field-w" id="sponsorshipFields" style="display: none;">
                <p split-text="" class="text-small caps">What type of sponsorship are you interested in?</p>
                <div class="checkboxes-w is-grid">
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="sponsorFinancial" type="radio" name="sponsorshipType" value="Financial Support" data-name="sponsorshipType" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="sponsorFinancial">Financial Support</span>
                    </label>
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="sponsorSwag" type="radio" name="sponsorshipType" value="Swag & Merchandise" data-name="sponsorshipType" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="sponsorSwag">Swag & Merchandise</span>
                    </label>
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="sponsorPlatform" type="radio" name="sponsorshipType" value="Platform Partnership" data-name="sponsorshipType" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="sponsorPlatform">Platform Partnership</span>
                    </label>
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="sponsorEvent" type="radio" name="sponsorshipType" value="Event Sponsorship" data-name="sponsorshipType" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="sponsorEvent">Event Sponsorship</span>
                    </label>
                </div>
                <div class="form-line"></div>
                
                <p split-text="" class="text-small caps">Organization Type</p>
                <div class="checkboxes-w is-grid">
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="orgStartup" type="radio" name="organizationType" value="Startup" data-name="organizationType" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="orgStartup">Startup</span>
                    </label>
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="orgSME" type="radio" name="organizationType" value="Small/Medium Enterprise" data-name="organizationType" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="orgSME">SME</span>
                    </label>
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="orgEnterprise" type="radio" name="organizationType" value="Large Enterprise" data-name="organizationType" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="orgEnterprise">Enterprise</span>
                    </label>
                    <label class="checkbox-box w-radio">
                        <div class="w-form-formradioinput w-form-formradioinput--inputType-custom checkbox-toggle is-radio w-radio-input"></div>
                        <input id="orgNonProfit" type="radio" name="organizationType" value="Non-Profit" data-name="organizationType" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="btn-txt checkbox-txt w-form-label" for="orgNonProfit">Non-Profit</span>
                    </label>
                </div>
                <div class="form-line"></div>
            </div>
        `;

        // Insert inquiry type field after the message field
        const messageField = document.querySelector('textarea[name="message"]').closest('.form-field-w');
        if (messageField) {
            messageField.insertAdjacentHTML('afterend', inquiryTypeHTML);

            // Insert sponsorship fields after the inquiry type field
            const inquiryTypeField = document.getElementById('inquiryTypeField');
            inquiryTypeField.insertAdjacentHTML('afterend', sponsorshipHTML);
        }

        // Update services field for DevSync context
        updateServicesField();

        // Add event listeners for inquiry type changes
        setupEventListeners();
    }

    function updateServicesField() {
        const servicesField = document.querySelector('input[name="Development"]')?.closest('.form-field-w');
        if (servicesField) {
            const servicesHTML = `
                <p split-text="" class="text-small caps">What Services do you need?</p>
                <div checkbox-group="" class="checkboxes-w">
                    <label class="w-checkbox checkbox-box">
                        <div class="btn-txt checkbox-txt">Development</div>
                        <div class="w-checkbox-input w-checkbox-input--inputType-custom checkbox-toggle"></div>
                        <input id="cDevelopment" type="checkbox" name="services" value="Development" data-name="Development" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="checkbox-label-1 w-form-label" for="Development">Development</span>
                    </label>
                    <label class="w-checkbox checkbox-box">
                        <div class="btn-txt checkbox-txt">Open Source Consulting</div>
                        <div class="w-checkbox-input w-checkbox-input--inputType-custom checkbox-toggle"></div>
                        <input id="cConsulting" type="checkbox" name="services" value="Consulting" data-name="Consulting" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="checkbox-label-1 w-form-label" for="Consulting">Consulting</span>
                    </label>
                    <label class="w-checkbox checkbox-box">
                        <div class="btn-txt checkbox-txt">Mentorship</div>
                        <div class="w-checkbox-input w-checkbox-input--inputType-custom checkbox-toggle"></div>
                        <input id="cMentorship" type="checkbox" name="services" value="Mentorship" data-name="Mentorship" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="checkbox-label-1 w-form-label" for="Mentorship">Mentorship</span>
                    </label>
                    <label class="w-checkbox checkbox-box">
                        <div class="btn-txt checkbox-txt">Training & Workshops</div>
                        <div class="w-checkbox-input w-checkbox-input--inputType-custom checkbox-toggle"></div>
                        <input id="cTraining" type="checkbox" name="services" value="Training" data-name="Training" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="checkbox-label-1 w-form-label" for="Training">Training</span>
                    </label>
                    <label class="w-checkbox checkbox-box">
                        <div class="btn-txt checkbox-txt">Other</div>
                        <div class="w-checkbox-input w-checkbox-input--inputType-custom checkbox-toggle"></div>
                        <input id="cOther" type="checkbox" name="services" value="Other" data-name="Other" style="opacity:0;position:absolute;z-index:-1" />
                        <span class="checkbox-label-1 w-form-label" for="Other">Other</span>
                    </label>
                </div>
                <div class="form-line"></div>
            `;

            servicesField.innerHTML = servicesHTML;
            servicesField.id = 'servicesField';
        }
    }

    function setupEventListeners() {
        const inquiryTypeInputs = document.querySelectorAll('input[name="inquiryType"]');
        inquiryTypeInputs.forEach(input => {
            input.addEventListener('change', handleInquiryTypeChange);
        });

        // Update form submission handler
        form.addEventListener('submit', handleFormSubmission);
    }

    function handleInquiryTypeChange(e) {
        const inquiryType = e.target.value;
        const servicesField = document.getElementById('servicesField');
        const sponsorshipFields = document.getElementById('sponsorshipFields');
        const websiteField = document.querySelector('input[name="Website"]')?.closest('.form-field-w');
        const dateField = document.querySelector('input[name="Date"]')?.closest('.form-field-w');
        const budgetSection = document.querySelector('input[name="budgetGroup"]')?.closest('.form-field-w');
        const deadlineSection = document.querySelector('input[name="deadlineGroup"]')?.closest('.form-field-w');

        if (inquiryType === 'sponsorship') {
            // Show sponsorship fields
            if (sponsorshipFields) sponsorshipFields.style.display = 'block';

            // Hide general service fields
            if (servicesField) servicesField.style.display = 'none';
            if (websiteField) websiteField.style.display = 'none';
            if (dateField) dateField.style.display = 'none';
            if (budgetSection) budgetSection.style.display = 'none';
            if (deadlineSection) deadlineSection.style.display = 'none';

            // Update required fields for sponsorship
            setRequiredFields(true);

            // Update placeholders
            const nameInput = document.querySelector('input[name="name"]');
            const messageInput = document.querySelector('textarea[name="message"]');
            if (nameInput) nameInput.placeholder = "Organization Representative Name";
            if (messageInput) messageInput.placeholder = "Tell us about your organization and sponsorship goals...";

        } else {
            // Show general fields
            if (servicesField) servicesField.style.display = 'block';
            if (websiteField) websiteField.style.display = 'block';
            if (dateField) dateField.style.display = 'block';
            if (budgetSection) budgetSection.style.display = 'block';
            if (deadlineSection) deadlineSection.style.display = 'block';

            // Hide sponsorship fields
            if (sponsorshipFields) sponsorshipFields.style.display = 'none';

            // Update required fields for general inquiry
            setRequiredFields(false);

            // Reset placeholders
            const nameInput = document.querySelector('input[name="name"]');
            const messageInput = document.querySelector('textarea[name="message"]');
            if (nameInput) nameInput.placeholder = "Full Name";
            if (messageInput) messageInput.placeholder = "Write your brief here in no more than five hundred words...";
        }
    }

    function setRequiredFields(isSponsorship) {
        const sponsorshipTypeInputs = document.querySelectorAll('input[name="sponsorshipType"]');
        const organizationTypeInputs = document.querySelectorAll('input[name="organizationType"]');
        const serviceInputs = document.querySelectorAll('input[name="services"]');
        const budgetInputs = document.querySelectorAll('input[name="budgetGroup"]');
        const deadlineInputs = document.querySelectorAll('input[name="deadlineGroup"]');
        const websiteInput = document.querySelector('input[name="Website"]');
        const dateInput = document.querySelector('input[name="Date"]');

        if (isSponsorship) {
            // Make sponsorship fields required
            sponsorshipTypeInputs.forEach(input => input.required = true);
            // organizationTypeInputs.forEach(input => input.required = true); // Optional for now

            // Make general fields not required
            serviceInputs.forEach(input => input.required = false);
            budgetInputs.forEach(input => input.required = false);
            deadlineInputs.forEach(input => input.required = false);
            if (websiteInput) websiteInput.required = false;
            if (dateInput) dateInput.required = false;
        } else {
            // Make general fields required (but make them optional for better UX)
            serviceInputs.forEach(input => input.required = false);
            budgetInputs.forEach(input => input.required = false);
            deadlineInputs.forEach(input => input.required = false);
            if (websiteInput) websiteInput.required = false;
            if (dateInput) dateInput.required = false;

            // Make sponsorship fields not required
            sponsorshipTypeInputs.forEach(input => input.required = false);
            organizationTypeInputs.forEach(input => input.required = false);
        }
    }

    async function handleFormSubmission(e) {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const inquiryType = data.inquiryType;

        // Show loading state
        showToast({
            title: 'Sending Message',
            message: 'Please wait while we process your inquiry...',
            type: 'loading',
            duration: 10000
        });

        try {
            let endpoint = '';
            let payload = {};

            if (inquiryType === 'sponsorship') {
                endpoint = `${serverUrl}/api/sponsorship/inquiry`;

                // Collect selected services
                const selectedServices = Array.from(document.querySelectorAll('input[name="services"]:checked'))
                    .map(input => input.value);

                payload = {
                    organization: data.name, // Using name as organization name for sponsorship
                    name: data.name,
                    email: data.email,
                    phone: 'N/A', // Not collected in contact form
                    sponsorshipType: data.sponsorshipType,
                    organizationType: data.organizationType || 'Not specified',
                    message: data.message,
                    services: selectedServices.length > 0 ? selectedServices.join(', ') : 'Not specified',
                    inquirySource: 'contact-form'
                };
            } else {
                // For general inquiries, we'll use the existing contact endpoint or create a new one
                endpoint = `${serverUrl}/api/contact/inquiry`;

                // Collect all form data for general inquiry
                const selectedServices = Array.from(document.querySelectorAll('input[name="services"]:checked'))
                    .map(input => input.value);

                const selectedBudget = document.querySelector('input[name="budgetGroup"]:checked')?.value;
                const selectedDeadline = document.querySelector('input[name="deadlineGroup"]:checked')?.value;

                payload = {
                    name: data.name,
                    email: data.email,
                    message: data.message,
                    website: data.Website || '',
                    startDate: data.Date || '',
                    services: selectedServices.length > 0 ? selectedServices.join(', ') : '',
                    budget: selectedBudget || '',
                    deadline: selectedDeadline || '',
                    inquiryType: 'general'
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to send inquiry');
            }

            // Show success message
            showToast({
                title: 'Message Sent!',
                message: inquiryType === 'sponsorship'
                    ? 'Thank you for your sponsorship interest! We will contact you soon.'
                    : 'Thank you for your inquiry! We will get back to you ASAP.',
                type: 'success'
            });

            // Reset form
            form.reset();

            // Reset visibility of fields
            const sponsorshipFields = document.getElementById('sponsorshipFields');
            if (sponsorshipFields) sponsorshipFields.style.display = 'none';

        } catch (error) {
            console.error('Error submitting form:', error);
            showToast({
                title: 'Error',
                message: 'Failed to send your inquiry. Please try again or contact us directly at contact@devsync-opensource.tech',
                type: 'error'
            });
        }
    }

    // Add form validation feedback
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            if (input.value.trim() === '') {
                input.style.borderColor = 'rgba(220, 53, 69, 0.5)';
            } else {
                input.style.borderColor = '';
            }
        });

        input.addEventListener('input', () => {
            if (input.style.borderColor) {
                input.style.borderColor = '';
            }
        });
    });
});
