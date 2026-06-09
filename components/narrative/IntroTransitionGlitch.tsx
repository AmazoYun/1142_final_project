/** transition 圖片上的大量 glitch 疊層 */
export default function IntroTransitionGlitch() {
  return (
    <div
      className="intro-transition__glitch-overlay intro-transition__glitch-overlay--heavy"
      aria-hidden
    >
      <div className="intro-transition__slice-bands" />
      <div className="intro-transition__scanlines" />
      <div className="intro-transition__noise" />
      <div className="intro-transition__chromatic intro-transition__chromatic--r" />
      <div className="intro-transition__chromatic intro-transition__chromatic--g" />
      <div className="intro-transition__chromatic intro-transition__chromatic--b" />
      <div className="intro-transition__rgb-split" />
      <div className="intro-transition__flicker" />
      <div className="intro-transition__block-tear" />
    </div>
  );
}
