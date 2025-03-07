/**
 * Main JavaScript for Agentda
 * Handles common functionality across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
  // Mobile Menu Toggle
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navbarNav = document.querySelector('.navbar-nav');
  
  if (mobileMenuToggle && navbarNav) {
    mobileMenuToggle.addEventListener('click', function() {
      navbarNav.classList.toggle('open');
    });
  }
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', function(event) {
    if (navbarNav && navbarNav.classList.contains('open') && 
        !navbarNav.contains(event.target) && 
        !mobileMenuToggle.contains(event.target)) {
      navbarNav.classList.remove('open');
    }
  });
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        e.preventDefault();
        
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Offset for fixed header
          behavior: 'smooth'
        });
        
        // Update URL without scrolling
        history.pushState(null, null, targetId);
      }
    });
  });
  
  // Add active class to nav links based on current page
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
  
  // Add active class to mobile nav items based on current page
  document.querySelectorAll('.mobile-nav-item').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
  
  // Add fade-in animation to elements when they enter the viewport
  const animateOnScroll = function() {
    const elements = document.querySelectorAll('.card, .feature-card, .testimonial-card, .section, .row > div');
    
    elements.forEach(element => {
      const elementPosition = element.getBoundingClientRect().top;
      const screenPosition = window.innerHeight / 1.2;
      
      if (elementPosition < screenPosition) {
        element.classList.add('fade-in');
      }
    });
  };
  
  window.addEventListener('scroll', animateOnScroll);
  animateOnScroll(); // Run once on page load
});
