export default function () {
    const stickies = document.querySelectorAll('.sticky');
    const observer = new IntersectionObserver(
        ([e]) => {
            e.target.classList.toggle('is-stuck', e.intersectionRatio < 1);

            if (e.boundingClientRect.top > 0) {
                e.target.classList.remove('is-stuck');
            }
        },
        {
            rootMargin: '-1px 0px 0px 0px',
            threshold: [1],
        },
    );

    stickies.forEach((sticky) => {
        observer.observe(sticky);
    });
}
