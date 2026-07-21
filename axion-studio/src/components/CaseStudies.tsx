import BadgeRow from "./BadgeRow";
import TextRollButton from "./TextRollButton";

/**
 * "Lediga bostäder"-sektionen. I stället för enskilda annonser som ständigt
 * måste uppdateras bjuder den in besökaren att lämna en intresseanmälan –
 * så kan sidan vara självgående.
 */
export default function CaseStudies() {
  return (
    <section id="bostader" className="bg-[#E4E7EB] pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-28 lg:pt-28">
      <div className="mx-auto w-full max-w-[1440px]">
        <BadgeRow number="2" label="Våra bostäder" borderClass="border-gray-300" />

        <h2
          className="reveal mb-8 px-5 font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 sm:mb-10 sm:px-8 lg:mb-12 lg:px-12"
          style={{ fontSize: "clamp(1.75rem, 6vw, 3.6rem)" }}
        >
          Lediga bostäder
        </h2>

        <div className="px-5 sm:px-8 lg:px-12">
          <p className="reveal max-w-3xl text-[18px] font-medium leading-[1.55] text-gray-900 sm:text-[22px]">
            Vårt bostadsutbud varierar över tid och publiceras inte alltid i sin
            helhet här på sidan. För aktuell information om lediga och kommande
            bostäder är du välkommen att kontakta oss eller lämna en
            intresseanmälan.
          </p>

          <div className="mt-10 grid gap-8 sm:mt-14 lg:grid-cols-2 lg:gap-16">
            <div className="reveal space-y-5 text-[15px] leading-[1.75] text-gray-700 sm:text-[17px]">
              <p>
                När du lämnar en intresseanmälan får vi veta mer om dina
                önskemål — antal rum, våning, önskad inflyttning och annat som är
                viktigt för dig. Så snart en passande bostad blir tillgänglig
                kontaktar vi dig.
              </p>
              <p>
                Vi arbetar med en intresselista i stället för löpande
                annonsering. På så sätt kan vi matcha rätt bostad med rätt
                hyresgäst, och du behöver inte själv bevaka sidan — vi
                återkommer när det är aktuellt.
              </p>
            </div>

            <div
              className="reveal space-y-5 text-[15px] leading-[1.75] text-gray-700 sm:text-[17px]"
              style={{ transitionDelay: "120ms" }}
            >
              <p>
                Har du frågor om en specifik adress, om kötid eller om vad som
                krävs för att bli hyresgäst hos oss? Kontakta oss gärna. Vi
                hjälper dig genom hela processen, från första kontakt till
                inflyttning.
              </p>
              <p>
                Oavsett om du planerar att flytta inom kort eller på längre sikt
                är du välkommen att kontakta oss. Ju mer vi känner till om dina
                behov, desto bättre kan vi vägleda dig till rätt bostad.
              </p>
            </div>
          </div>

          <div className="reveal mt-10 sm:mt-14">
            <TextRollButton label="Våra lägenheter" href="#/vara-lagenheter" />
          </div>
        </div>
      </div>
    </section>
  );
}
