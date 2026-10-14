export type Photo = {
  file: string;
  alt: string;
  wide?: boolean;
};

const interiorFiles: Photo[] = [
  {
    file: "313929861_1585241385263692_62280303477915439_n.jpg",
    alt: "Salon z szarą kanapą i drewnianym stolikiem",
    wide: true,
  },
  {
    file: "313868635_3241192566142776_5212338560988719464_n.jpg",
    alt: "Narożnik w salonie",
  },
  {
    file: "313913250_2164638637042401_2216156888539793153_n.jpg",
    alt: "Salon i stół jadalniany",
  },
  {
    file: "313921451_878488330195611_2915548877323074513_n.jpg",
    alt: "Aneks kuchenny z lodówką i jadalnią",
    wide: true,
  },
  {
    file: "313927441_677715020539272_1366416128837929555_n.jpg",
    alt: "Stół dla czterech osób przy oknie",
  },
  {
    file: "313922366_1471678799982831_7131217788761303551_n.jpg",
    alt: "Sypialnia z podwójnym łóżkiem",
    wide: true,
  },
  {
    file: "313453002_457321393174988_469572967872317263_n.jpg",
    alt: "Sypialnia z oknem",
  },
  {
    file: "313859119_670707244421639_3934879843092059251_n.jpg",
    alt: "Widok z sypialni na aneks kuchenny",
  },
  {
    file: "313358967_664274498634610_2424327517193747976_n.jpg",
    alt: "Szafa w sypialni",
  },
  {
    file: "313862334_875171137184590_3873338311383138435_n.jpg",
    alt: "Wejście do sypialni",
  },
  {
    file: "312955269_813306019845726_7247512905667475116_n.jpg",
    alt: "Przejście z salonu do sypialni",
  },
  {
    file: "313934766_492215339633587_4359038393265467637_n.jpg",
    alt: "Przedpokój",
  },
  {
    file: "313918637_420622380282481_1638485398697411405_n.jpg",
    alt: "Łazienka",
  },
];

const gardenFiles: Photo[] = [
  {
    file: "IMG_20221008_141050.jpg",
    alt: "Ogród i zieleń przy apartamencie",
  },
  {
    file: "IMG_20221008_141543.jpg",
    alt: "Drzewa i budynek od strony ogrodu",
  },
  {
    file: "IMG_20221008_141425.jpg",
    alt: "Trawnik w okolicy apartamentu",
  },
];

export function photoSrc(file: string): string {
  return `/foty/${file}`;
}

export const interiorPhotos = interiorFiles;
export const gardenPhotos = gardenFiles;
export const heroPhoto = interiorFiles[0];
