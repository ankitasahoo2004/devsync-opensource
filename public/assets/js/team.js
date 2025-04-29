document.addEventListener('DOMContentLoaded', function () {
    const links = document.querySelectorAll('.username-link');
  
    links.forEach(link => {
      let clickCount = 0;
      let timer;
  
      link.addEventListener('click', (e) => {
        e.preventDefault();
        clickCount++;
  
        clearTimeout(timer);
        timer = setTimeout(() => {
          let targetURL = null;
  
          if (clickCount === 1) {
            targetURL = link.dataset.single;
          } else if (clickCount === 2) {
            targetURL = link.dataset.double;
          } else if (clickCount === 3) {
            targetURL = link.dataset.triple;
          }
  
          if (targetURL) {
            window.open(targetURL, '_blank', 'noopener,noreferrer');
          }
  
          clickCount = 0;
        }, 400); // Adjust delay for click grouping
      });
    });
  });
  