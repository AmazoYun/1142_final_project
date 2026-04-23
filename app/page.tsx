import { FaCrown } from "react-icons/fa";

export default function Home() {
  return(
    <div className="h-screen flex justify-center items-center">
      <div className="w-[400px] h-[400px] bg-black rounded-2xl flex-col justify-center items-center p-20">
        <div className="text-white text-center font-bold text-4xl">
          第三組
        </div>
        <div className="flex text-white text-center font-bold text-3xl mt-5 gap-2 justify-center">
          <FaCrown color="yellow" size="35px" />
          <>鄧柏希</>
        </div>
        <div className="text-white text-center font-bold text-3xl mt-3">
          吳尚鴻
        </div>
        <div className="text-white text-center font-bold text-3xl mt-3">
          許兆豐
        </div>
        <div className="text-white text-center font-bold text-3xl mt-3">
          呂芃慧
        </div>
      </div>
    </div>
  );
}
